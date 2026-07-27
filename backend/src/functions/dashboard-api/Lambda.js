const { withErrorHandling } = require('../../middlewares/errorHandler');
const { getDashboardData } = require('../../services/dashboardApiService');

async function DashboardApiHandler(event) {
    const userId = (event.queryStringParameters && event.queryStringParameters.userId) || "USR12345";
    const result = await getDashboardData(userId);
    return {
        statusCode: 200,
        body: JSON.stringify(result),
    };
}

exports.handler = withErrorHandling(DashboardApiHandler);