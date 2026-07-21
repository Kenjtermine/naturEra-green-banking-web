
async function processTransaction(body) {
  return {
    transactionId: '1234567890',
    status: 'SUCCESS',
  };
  // mẫu trả về, triển khai logic nghiệp vụ thực tế ở đây, ví dụ validate input, gọi DB, gọi API bên ngoài...
}

module.exports = { processTransaction };