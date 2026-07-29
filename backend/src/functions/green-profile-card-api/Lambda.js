// const { withErrorHandling } = require('../../middlewares/errorHandler');
// const { getGreenProfile } = require('../../services/greenProfileService');
import getGreenProfile from '../../services/greenProfileService.js'; // viết chuẩn ESM

async function GreenProfileHandler(event) {
    try {
        const requestId = event.pathParameters.requestId;

        const claims = event.requestContext.authorizer.claims;
        const callerId = claims.sub;
        const callerRole = claims['custom:role'] || 'USER';

        // 2. Gọi Service
        const result = await getGreenProfile(requestId, callerId, callerRole);

        // 3. Trả JSON về
        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (err) {
        return { statusCode: err.statusCode || 500, body: JSON.stringify({ message: err.message }) };
    }
}

export const handler = GreenProfileHandler;
