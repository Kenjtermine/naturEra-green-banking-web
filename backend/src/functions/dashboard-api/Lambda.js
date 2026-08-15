import getDashboardData from '../../services/dashboardApiService.js';
import { getAuthClaims } from '../../utils/authClaims.js';

async function handler(event) {
    try {
        // 1. Lấy thông tin từ request
        const claims = getAuthClaims(event);
        const path = event.path || "";
        const pathParams = event.pathParameters || {};
        const queryParams = event.queryStringParameters || {};
        const httpMethod = event.httpMethod || "GET";

        if (httpMethod === "OPTIONS") {
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Api-Key,X-Amz-Date,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS"
                },
                body: ""
            };
        }

        // Lấy identity theo request path. Trong customer contract, path chính là nguồn thật
        // của userId; claims chỉ dùng để xác thực và fallback khi local/test event không có path.
        const userId = pathParams.userId || pathParams.requestId || claims.sub || claims['custom:userId'] || claims['cognito:username'] || "demo-user-001";
        const cardId = pathParams.cardId || claims['custom:cardId'] || "card_001";

        // 2. Kéo toàn bộ dữ liệu từ DB lên
        const dashboardData = await getDashboardData(userId);

        // 3. Mini-Router: Gọt đẽo dữ liệu trả về cho khớp với Frontend
        let responseBody = {};

        if (path.includes('/balance')) {
            // Frontend cần: { card_id, balance, currency, updated_at }
            responseBody = {
                card_id: cardId,
                balance: dashboardData.balance ?? 0,
                currency: "VND",
                updated_at: new Date().toISOString()
            };
        }
        else if (path.includes('/transactions')) {
            const limit = Number(queryParams.limit || 20);
            const offset = Number(queryParams.offset || 0);
            const allItems = Array.isArray(dashboardData.transactions) ? dashboardData.transactions : [];
            const pagedItems = allItems.slice(offset, offset + limit);

            responseBody = {
                items: pagedItems,
                total: allItems.length,
                limit,
                offset,
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
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Api-Key,X-Amz-Date,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS"
            },
            body: JSON.stringify(responseBody),
        };

    } catch (err) {
        console.error("API Error:", err);
        return {
            statusCode: err.statusCode || 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Api-Key,X-Amz-Date,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS"
            },
            body: JSON.stringify({
                errorCode: err.errorCode || 'INTERNAL_ERROR',
                message: err.message || 'Internal server error',
            }),
        };
    }
}

export { handler };
