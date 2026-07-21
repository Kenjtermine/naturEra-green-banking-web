const { withErrorHandling } = require('../../middlewares/errorHandler');
const { processTransaction } = require('../../services/transactionService');

/**
 * Lambda handler — CHỈ làm 3 việc: parse event, gọi service, format response.
 * Không viết business logic ở đây (đó là lỗi thường gặp khi mới chuyển từ Express sang Lambda).
 */
async function TransactionInterceptorHandler(event) {
  const body = JSON.parse(event.body || '{}');
  const result = await processTransaction(body);

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };

}

exports.handler = withErrorHandling(TransactionInterceptorHandler);
