/**
 * MVP: bọc tay đơn giản, không dùng thư viện middy.
 * Bắt AppError (có errorCode/statusCode) từ service, map đúng theo bảng lỗi trong API Contract.
 * Production: nên đổi sang middy để compose nhiều middleware (auth, idempotency...) dễ hơn.
 * withErrorHandling() là middleware, nhận rawHandler (Lambda handler) làm input, trả về Lambda handler mới có error handling.
 */
function withErrorHandling(rawHandler) {
  return async (event, context) => {
    try {
      return await rawHandler(event, context);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      const errorCode = err.errorCode || 'INTERNAL_ERROR';
      console.error(JSON.stringify({ errorCode, message: err.message, stack: err.stack }));
      return {
        statusCode,
        body: JSON.stringify({ errorCode, message: err.message }),
      };
    }
  };
}

module.exports = { withErrorHandling };
