/**
 * Lỗi nghiệp vụ có errorCode + statusCode chuẩn theo API Contract.
 * Được throw ở service layer, không được catch ở Lambda handler.
 * Lambda runtime sẽ tự động:
 * - API Gateway: convert exception → HTTP response (502 + error details)
 * - EventBridge: mark invocation Failed, retry 2 lần, send to DLQ
 */
class AppError extends Error {
  constructor(errorCode, message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}

export default AppError;
