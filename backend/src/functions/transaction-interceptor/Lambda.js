import processTransaction from '../../services/transactionService.js';

/**
 * Lambda handler cho Transaction API (API Gateway trigger)
 * 
 * Error handling:
 * - Throw errors ra ngoài (đừng catch-return)
 * - API Gateway + Lambda runtime sẽ handle:
 *   - AppError (có statusCode): map đúng (402/403/409...)
 *   - Lỗi khác: 502 Bad Gateway
 * - CloudWatch logs sẽ record tất cả errors
 * - Caller (POS) sẽ nhận error response với error code từ exception message
 */
export const handler = async (event) => {
  console.log('[TransactionInterceptor] Event:', JSON.stringify(event));
  
  try {
    const body = JSON.parse(event.body || '{}');
    const idempotencyKey = event.headers?.['Idempotency-Key'] || event.headers?.['idempotency-key'];
    
    const result = await processTransaction(body, idempotencyKey);
    
    console.log('[TransactionInterceptor] Success:', JSON.stringify(result));
    
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    // Log error — AWS Lambda sẽ ghi vào CloudWatch
    const errorInfo = {
      errorCode: err.errorCode || 'INTERNAL_ERROR',
      message: err.message,
      statusCode: err.statusCode || 500,
      stack: err.stack,
    };
    console.error('[TransactionInterceptor] Error:', JSON.stringify(errorInfo));
    
    // Throw lỗi ra — API Gateway sẽ convert thành HTTP response
    throw err;
  }
};
