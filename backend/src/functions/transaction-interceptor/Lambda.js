import processTransaction from '../../services/transactionService.js';

// KHAI BÁO SẴN HEADER CORS Ở ĐÂY
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "OPTIONS,POST"
};

export const handler = async (event) => {
  console.log('[TransactionInterceptor] Event:', JSON.stringify(event));

  try {
    const body = JSON.parse(event.body || '{}');
    const idempotencyKey = event.headers?.['Idempotency-Key'] || event.headers?.['idempotency-key'];

    const result = await processTransaction(body, idempotencyKey);

    console.log('[TransactionInterceptor] Success:', JSON.stringify(result));

    return {
      statusCode: 200,
      headers: corsHeaders, // <--- ĐÃ BỔ SUNG Ở ĐÂY
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
      headers: corsHeaders, // <--- ĐÃ BỔ SUNG Ở ĐÂY
      body: JSON.stringify({
        errorCode: err.errorCode || 'INTERNAL_ERROR',
        message: err.message || 'Internal server error',
      }),
    };
  }
};