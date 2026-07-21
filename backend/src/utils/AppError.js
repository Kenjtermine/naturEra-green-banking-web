/**
 * Lỗi nghiệp vụ có errorCode + statusCode chuẩn theo API Contract.
 * Được throw ở service layer, bắt lại ở middleware/errorHandler.js
 */
class AppError extends Error {
  constructor(errorCode, message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
