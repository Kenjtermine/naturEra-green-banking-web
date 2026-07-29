import calculateCO2 from '../utils/co2Calculator.js';
import config from '../configs/config.js';
import { createTransaction, validateTransactionInput } from '../models/transactionModel.js';
import { debitAndRecordTransaction, getMonthlyCo2Usage, updateCardStatus } from '../repositories/accountRepo.js';
async function processTransaction(body, idempotencyKey) {
    // Validate the transaction data
    validateTransactionInput(body);

    const { cardId, userId, amount, currency, merchantId, mcc, posDeviceId } = body;

    const co2Amount = await calculateCO2(amount, mcc);
    const transaction = createTransaction(cardId, userId, amount, currency, merchantId, mcc, posDeviceId);
    transaction.co2Amount = co2Amount;
    transaction.status = 'APPROVED';

    const yyyyMM = transaction.createdAt.slice(0, 7);

    await debitAndRecordTransaction({
        userId,
        cardId,
        amount,
        co2Amount,
        transaction,
        yyyyMM,
        idempotencyKey,
    });

    const monthlyCo2Usage = await getMonthlyCo2Usage(userId, yyyyMM);
    if (monthlyCo2Usage.totalCo2Kg >= config.carbonQuotaLimitKg) {
        // Nếu đã vượt hạn mức carbon tháng này, tiến hành khóa thẻ
        console.log(`Người dùng ${userId} chạm ngưỡng CO2 (${monthlyCo2Usage.totalCo2Kg}kg). Tiến hành khóa thẻ ngay lập tức!`);
        await updateCardStatus(userId, cardId, 'LOCKED');
    }

    return {
        transactionId: transaction.transactionId,
        transactionStatus: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        co2Amount: transaction.co2Amount,
        carbonQuotaRemaining:  Number((config.carbonQuotaLimitKg - monthlyCo2Usage.totalCo2Kg).toFixed(2)),
        processedAt: transaction.createdAt,
    }

}

export default processTransaction;
