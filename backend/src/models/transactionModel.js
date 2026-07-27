
async function createTransaction(cardId, userId, amount, merchantId, mcc, posDeviceId) {
    const transaction = {
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, // exp: txn_1697040000000_ab12cd
        cardId,
        userId,
        amount,
        merchantId,
        mcc,
        co2Amount: 0, // Giá trị khởi tạo, sẽ được tính toán sau khi lấy config từ DB
        status: 'PENDING', // Trạng thái mặc định
        createdAt: new Date().toISOString(),
    };
    return transaction;
}

async function validateTransactionInput(body) {
    required = ['cardId', 'userId', 'amount', 'merchantId', 'posDeviceId'];
    const missingFields = required.filter((f) => body[f] === undefined || body[f] === null);
    if (missingFields.length > 0) {
        throw new AppError('MISSING_REQUIRED_FIELDS', `Thiếu trường bắt buộc: ${missingFields.join(', ')}`, 400);
    }
    if (amount <= 0 || typeof amount !== "number") {
        throw new AppError('INVALID_AMOUNT', 'Số tiền không hợp lệ', 400);
    }
}

export { createTransaction, validateTransactionInput };