import AppError from '../utils/AppError.js';

function validateMoneyAmount(amount, currency) {
    if (currency !== 'VND') {
        throw new AppError('INVALID_CURRENCY', 'Currency is invalid. MVP only supports VND', 400);
    }
    if (!Number.isInteger(amount) || amount <= 0) {
        throw new AppError('INVALID_AMOUNT', 'Amount must be a positive integer in VND', 400);
    }
}

function createTransaction(cardId, userId, amount, currency, merchantId, mcc, posDeviceId) {
    return {
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        cardId,
        userId,
        amount,
        currency,
        merchantId,
        mcc,
        co2Amount: 0,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
    };
}

function validateTransactionInput(body) {
    const required = ['cardId', 'userId', 'amount', 'currency', 'merchantId', 'mcc', 'posDeviceId'];
    const missingFields = required.filter((field) => body?.[field] === undefined || body?.[field] === null);

    if (missingFields.length > 0) {
        throw new AppError('MISSING_REQUIRED_FIELDS', `Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    validateMoneyAmount(body.amount, body.currency);
}

export { createTransaction, validateMoneyAmount, validateTransactionInput };
