import calculateCO2 from '../utils/co2Calculator.js';
import config from '../configs/config.js';
import { createTransaction, validateTransactionInput } from '../models/transactionModel.js';
import { debitAndRecordTransaction, getMonthlyCo2Usage, updateCardStatus } from '../repositories/accountRepo.js';

async function processTransaction(body, idempotencyKey) {
    const normalizedBody = {
        cardId: body.cardId || body.card_id,
        userId: body.userId || body.user_id,
        amount: Number(body.amount || 0),
        currency: body.currency || "VND",
        merchantId: body.merchantId || body.merchant_id || "merchant_001",
        mcc: body.mcc || "5999",
        posDeviceId: body.posDeviceId || "pos_device_01"
    };

    validateTransactionInput(normalizedBody);

    const { cardId, userId, amount, currency, merchantId, mcc, posDeviceId } = normalizedBody;

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
        console.log(`Người dùng ${userId} chạm ngưỡng CO2 (${monthlyCo2Usage.totalCo2Kg}kg). Tiến hành khóa thẻ!`);
        await updateCardStatus(userId, cardId, 'LOCKED');
    }

    return {
        transactionId: transaction.transactionId,
        transactionStatus: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        co2Amount: transaction.co2Amount,
        carbonQuotaRemaining: Number((config.carbonQuotaLimitKg - monthlyCo2Usage.totalCo2Kg).toFixed(2)),
        processedAt: transaction.createdAt,
    };
}

export default processTransaction;