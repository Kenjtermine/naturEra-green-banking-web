import monthlyOffsetBatch from '../../services/monthOffsetService.js';

async function monthlyOffsetBatchHandler(event, context) {
  console.log('[MonthlyOffsetBatch] Started at', new Date().toISOString());
  try {
    const result = await monthlyOffsetBatch();
    console.log('[MonthlyOffsetBatch] Completed:', JSON.stringify(result));
    return result; // không cần statusCode/body — không có HTTP caller nào đọc field này
  } catch (err) {
    console.error('[MonthlyOffsetBatch] FAILED:', err);
    throw err; // BẮT BUỘC throw ra ngoài — để AWS đánh dấu invocation Failed
  }
}

export const handler = monthlyOffsetBatchHandler;