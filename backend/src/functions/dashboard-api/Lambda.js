import getDashboardData from '../../services/dashboardApiService.js';

async function handler(event) {
    try {
        const claims = event.requestContext?.authorizer?.claims || {};
        const queryParams = event.queryStringParameters || {};
        const userId = claims.sub || queryParams.userId;

        const dashboardData = await getDashboardData(userId);

        return {
            statusCode: 200,
            body: JSON.stringify(dashboardData),
        };
    } catch (err) {
        return {
            statusCode: err.statusCode || 500,
            body: JSON.stringify({
                errorCode: err.errorCode || 'INTERNAL_ERROR',
                message: err.message || 'Internal server error',
            }),
        };
    }
}

export { handler };
