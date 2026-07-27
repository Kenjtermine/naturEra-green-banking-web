// Gọi thẳng vào file Lambda của em
const lambda = require('./src/functions/transaction-interceptor/Lambda.js');
// Lấy cục dữ liệu giả
const mockData = require('./src/functions/transaction-interceptor/mock-request.json');

async function runTest() {
    console.log("⏳ Đang chạy giả lập luồng giao dịch...");
    
    // Gói cục JSON lại cho giống với định dạng AWS gửi tới
    const event = { 
        body: JSON.stringify(mockData) 
    };
    
    // Bóp cò chạy hàm
    const result = await lambda.handler(event);
    
    console.log("\n✅ KẾT QUẢ TRẢ VỀ TỪ LAMBDA:");
    console.log(JSON.parse(result.body));
}

runTest();