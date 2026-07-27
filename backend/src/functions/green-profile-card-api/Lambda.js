const { withErrorHandling } = require('../../middlewares/errorHandler');
const { getGreenProfile } = require('../../services/greenProfileService');

async function GreenProfileHandler(event) {
    const userId = (event.queryStringParameters && event.queryStringParameters.userId) || "USR12345";

    // Gọi Service
    const result = await getGreenProfile(userId);

    // Trả JSON về
    return {
        statusCode: 200,
        body: JSON.stringify(result),
    };
}

exports.handler = withErrorHandling(GreenProfileHandler);