async function GetConfigHandler(event) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'AdminRuleConfigApi',
    }),
  };
}

exports.handler = AdminRuleConfigApiHandler;