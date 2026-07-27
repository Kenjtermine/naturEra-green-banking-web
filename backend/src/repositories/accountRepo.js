import { TransactWriteCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import ddbClient from './ddbClient';
import config from '../configs/config';
import AppError from '../utils/AppError';

/**
 * Trừ tiền + ghi log giao dịch + cộng dồn CO2 — atomic trong 1 TransactWriteItems.
 *
 * Mô hình "khóa ngay khi vượt" (ADR-003): giao dịch làm CO2 vượt hạn mức VẪN
 * được phép hoàn tất — chỉ giao dịch TIẾP THEO mới bị chặn, vì lúc đó
 * CARD#{cardId} đã có LockedFlag=true. Vì vậy cần thêm cardId + 1
 * ConditionCheck riêng (không ghi gì, chỉ kiểm tra) trỏ tới đúng item thẻ.
 */
async function debitAndRecordTransaction({ userId, cardId, amount, co2Amount, transaction, yyyyMM, idempotencyKey }) {
    try {
        await ddbClient.send(new TransactWriteCommand({
            ClientRequestToken: idempotencyKey,
            TransactItems: [
                {
                    Update: {
                        TableName: config.tableName,
                        Key: { PK: `USER#${userId}`, SK: `PROFILE` },
                        UpdateExpression: 'SET balance = balance - :amount',
                        ConditionExpression: 'balance >= :amount',
                        ExpressionAttributeValues: { ':amount': amount },
                    },
                },
                {
                    // Không ghi gì — chỉ chặn cả transaction nếu thẻ đang LOCKED.
                    ConditionCheck: {
                        TableName: config.tableName,
                        Key: { PK: `USER#${userId}`, SK: `CARD#${cardId}` },
                        ConditionExpression: 'attribute_not_exists(LockedFlag)',
                    },
                },
                {
                    Put: {
                        TableName: config.tableName,
                        Item: {
                            PK: `USER#${userId}`,
                            SK: `TXN#${transaction.createdAt}#${transaction.transactionId}`,
                            EntityType: 'TRANSACTION',
                            ...transaction,
                        },
                        ConditionExpression: 'attribute_not_exists(PK)', // chống ghi trùng item
                    },
                },
                {
                    Update: {
                        TableName: config.tableName,
                        Key: { PK: `USER#${userId}`, SK: `STAT#${yyyyMM}` },
                        // StatMonth = PK của GSI StatMonthIndex, để Monthly Batch Query
                        // theo tháng (không Scan) khi xét thưởng "dưới ngưỡng".
                        UpdateExpression: 'ADD totalCo2Kg :co2 SET StatMonth = :statMonth',
                        ExpressionAttributeValues: { ':co2': co2Amount, ':statMonth': `STAT#${yyyyMM}` },
                    },
                },
            ],
        }));

        return { success: true, transactionId: transaction.transactionId };
    } catch (err) {
        if (err.name === 'TransactionCanceledException') {
            const reasons = err.CancellationReasons || [];
            // Thứ tự reasons khớp đúng thứ tự TransactItems phía trên.
            if (reasons[0]?.Code === 'ConditionalCheckFailed') {
                throw new AppError('INSUFFICIENT_FUNDS', 'Không đủ số dư', 402);
            }
            if (reasons[1]?.Code === 'ConditionalCheckFailed') {
                throw new AppError('CARD_LOCKED', 'Thẻ đang bị khóa do vượt hạn mức carbon tháng trước', 403);
            }
            if (reasons[2]?.Code === 'ConditionalCheckFailed') {
                throw new AppError('DUPLICATE_IN_PROGRESS', 'Giao dịch trùng đang xử lý', 409);
            }
        }
        throw err;
    }
}

async function getMonthlyCo2Usage(userId, yyyyMM) {
    const result = await ddbClient.send(new GetCommand({
        TableName: config.tableName,
        Key: { PK: `USER#${userId}`, SK: `STAT#${yyyyMM}` },
    }));
    return result.Item || { totalCo2Kg: 0 };
}

/**
 * Khóa/mở khóa thẻ. SET/REMOVE là thao tác tự nhiên idempotent — không cần
 * ClientRequestToken (đó là lý do KHÔNG còn tham số idempotency key ở đây,
 * khác với debitAndRecordTransaction).
 * LockedFlag chỉ tồn tại khi LOCKED (sparse GSI) — tránh hot partition so với
 * việc dùng thẳng 1 attribute cardStatus có giá trị cố định làm PK của GSI.
 */
async function updateCardStatus(userId, cardId, status) {
    try {
        if (status === 'ACTIVE') {
            await ddbClient.send(new UpdateCommand({
                TableName: config.tableName,
                Key: { PK: `USER#${userId}`, SK: `CARD#${cardId}` },
                UpdateExpression: 'REMOVE LockedFlag, LockedAt',
                ConditionExpression: 'attribute_exists(LockedFlag)',
            }));
            console.log(`Card ${cardId} unlocked for user ${userId}`);
        } else if (status === 'LOCKED') {
            await ddbClient.send(new UpdateCommand({
                TableName: config.tableName,
                Key: { PK: `USER#${userId}`, SK: `CARD#${cardId}` },
                UpdateExpression: 'SET LockedFlag = :true, LockedAt = :now',
                ConditionExpression: 'attribute_not_exists(LockedFlag)',
                ExpressionAttributeValues: {
                    ':true': 'true',
                    ':now': new Date().toISOString(),
                },
            }));
            console.log(`Card ${cardId} locked for user ${userId}`);
        } else {
            throw new AppError('INVALID_CARD_STATUS', `Trạng thái thẻ không hợp lệ: ${status}`, 400);
        }
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            // Thẻ đã ở đúng trạng thái đích rồi — coi như thành công (idempotent).
            console.warn(`Card ${cardId} already in state ${status}`);
            return;
        }
        if (err instanceof AppError) throw err;
        console.error(`Error updating card ${cardId} status:`, err);
        throw new AppError('FAILED_TO_UPDATE_CARD_STATUS', `Không thể cập nhật thẻ ${cardId} thành ${status}`, 500);
    }
}

/**
 * Query users dưới ngưỡng thưởng cho 1 tháng cụ thể — dùng GSI, không Scan.
 * GSI StatMonthIndex: PK=StatMonth (STAT#yyyyMM), SK=totalCo2Kg.
 * LƯU Ý HẠ TẦNG: GSI này phải project cả attribute `rewardedThisMonth`
 * (không chỉ KEYS_ONLY), nếu không bước check "đã tặng chưa" ở service sẽ
 * luôn nhận undefined và có thể tặng trùng nhiều lần.
 */
async function queryUsersUnderQuotaForMonth(yyyyMM) {
    try {
        const rewardThreshold = config.rewardThresholdKg || 250;
        const result = await ddbClient.send(new QueryCommand({
            TableName: config.tableName,
            IndexName: 'StatMonthIndex',
            KeyConditionExpression: 'StatMonth = :statMonth AND totalCo2Kg < :threshold',
            ExpressionAttributeValues: {
                ':statMonth': `STAT#${yyyyMM}`,
                ':threshold': rewardThreshold,
            },
        }));
        return result.Items || [];
    } catch (err) {
        console.error('Error querying under-quota users:', err);
        throw new AppError('FAILED_TO_QUERY_UNDER_QUOTA_USERS', 'Không thể truy vấn người dùng dưới quota', 500);
    }
}

/** Query users đang bị khóa — sparse GSI, không Scan. */
async function queryCurrentlyLockedUsers() {
    try {
        const result = await ddbClient.send(new QueryCommand({
            TableName: config.tableName,
            IndexName: 'LockedCardIndex', // Sparse GSI: PK=LockedFlag, SK=LockedAt
            KeyConditionExpression: 'LockedFlag = :true',
            ExpressionAttributeValues: { ':true': 'true' },
        }));
        return result.Items || [];
    } catch (err) {
        console.error('Error querying locked users:', err);
        throw new AppError('FAILED_TO_QUERY_LOCKED_USERS', 'Không thể lấy danh sách người dùng đang khóa', 500);
    }
}

/** Ghi đánh dấu reward cho user tháng yyyyMM (ngăn tặng lại lần sau). */
async function markUserRewarded(userId, yyyyMM) {
    try {
        await ddbClient.send(new UpdateCommand({
            TableName: config.tableName,
            Key: { PK: `USER#${userId}`, SK: `STAT#${yyyyMM}` },
            UpdateExpression: 'SET rewardedThisMonth = :true, rewardedAt = :now',
            ExpressionAttributeValues: {
                ':true': 'true',
                ':now': new Date().toISOString(),
            },
        }));
    } catch (err) {
        console.error('Error marking user rewarded:', err);
        throw new AppError('FAILED_TO_MARK_REWARDED', 'Không thể ghi dấu tặng thưởng', 500);
    }
}

export {
    debitAndRecordTransaction,
    getMonthlyCo2Usage,
    updateCardStatus,
    queryCurrentlyLockedUsers,
    queryUsersUnderQuotaForMonth,
    markUserRewarded,
};