import processTransaction from '../../services/transactionService.js';

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
    const errorInfo = {
      errorCode: err.errorCode || 'INTERNAL_ERROR',
      message: err.message,
      statusCode: err.statusCode || 500,
      stack: err.stack,
    };
    console.error('[TransactionInterceptor] Error:', JSON.stringify(errorInfo));

    return {
      statusCode: err.statusCode || 500,
      body: JSON.stringify({
        errorCode: err.errorCode || 'INTERNAL_ERROR',
        message: err.message || 'Internal server error',
      }),
    };
  }
};
