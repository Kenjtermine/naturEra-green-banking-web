// Gọi thẳng vào 2 file Lambda em vừa tạo
const profileLambda = require('./src/functions/green-profile-card-api/Lambda.js');
const dashboardLambda = require('./src/functions/dashboard-api/Lambda.js');

async function runTests() {
    // Giả lập Frontend gửi request có chứa userId trên URL
    const mockEvent = {
        queryStringParameters: {
            userId: "USR12345"
        }
    };

    console.log("⏳ TEST 1: Đang gọi API Green Profile...");
    const profileResult = await profileLambda.handler(mockEvent);
    console.log("✅ KẾT QUẢ GREEN PROFILE:");
    console.log(JSON.parse(profileResult.body));
    
    console.log("\n--------------------------------------------------\n");

    console.log("⏳ TEST 2: Đang gọi API Dashboard...");
    const dashboardResult = await dashboardLambda.handler(mockEvent);
    console.log("✅ KẾT QUẢ DASHBOARD:");
    console.log(JSON.parse(dashboardResult.body));
}

runTests();