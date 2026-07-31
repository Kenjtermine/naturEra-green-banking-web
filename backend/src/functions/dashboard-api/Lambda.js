import getDashboardData from '../../services/dashboardApiService.js';

async function handler(event) {
    try {
        // 1. Lấy thông tin từ request
        const claims = event.requestContext?.authorizer?.claims || {};
        const path = event.path || ""; 
        const pathParams = event.pathParameters || {};
        
        // Lấy userId (từ token hoặc tham số, hoặc dùng ID thật của em dưới DB để test)
        const userId = "demo-user-001";

        // 2. Kéo toàn bộ dữ liệu từ DB lên
        const dashboardData = await getDashboardData(userId);

        // 3. Mini-Router: Gọt đẽo dữ liệu trả về cho khớp với Frontend
        let responseBody = {};

        if (path.includes('/balance')) {
            // Frontend cần: { card_id, balance, currency, updated_at }
            responseBody = {
                card_id: pathParams.cardId || "card_001",
                balance: dashboardData.balance ?? 0,
                currency: "VND",
                updated_at: new Date().toISOString()
            };
        } 
        else if (path.includes('/transactions')) {
            // Frontend cần: { items: [...], total, limit, offset }
            responseBody = {
                items: dashboardData.transactions || [],
                total: dashboardData.transactions?.length || 0,
                limit: 20,
                offset: 0
            };
        } 
        else if (path.includes('/carbon-credits')) {
            // Frontend cần: { user_id, total_co2_kg, green_points, rank }
            responseBody = {
                user_id: userId,
                total_co2_kg: dashboardData.carbonCredit?.total_co2_kg || 0,
                green_points: dashboardData.carbonCredit?.green_points || 0,
                rank: dashboardData.carbonCredit?.rank || "Bậc đồng"
            };
        } 
        else {
            // Mặc định trả về hết nếu không khớp path nào
            responseBody = dashboardData;
        }

        // 4. Trả về Frontend kèm Header mở cửa CORS
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", 
                "Access-Control-Allow-Credentials": true
            },
            body: JSON.stringify(responseBody),
        };

    } catch (err) {
        console.error("API Error:", err);
        return {
            statusCode: err.statusCode || 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({
                errorCode: err.errorCode || 'INTERNAL_ERROR',
                message: err.message || 'Internal server error',
            }),
        };
    }
}

export { handler };