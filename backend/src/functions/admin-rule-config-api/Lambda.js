async function AdminRuleConfigHandler(event) {
  console.log('[AdminRuleConfig] Event:', JSON.stringify(event));

  try {
    const result = await AdminRuleConfigService(event);
    console.log('[AdminRuleConfig] Success:', JSON.stringify(result));
    return result; // không cần statusCode/body — không có HTTP caller nào đọc field này
  } catch (err) {
    console.error('[AdminRuleConfig] FAILED:', err);
    throw err; // BẮT BUỘC throw ra ngoài — để AWS đánh dấu invocation Failed
  }

}

export const handler = AdminRuleConfigHandler;