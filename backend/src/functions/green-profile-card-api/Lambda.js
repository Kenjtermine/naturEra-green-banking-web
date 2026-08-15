import getGreenProfile from '../../services/greenProfileService.js';
import { requireAuthClaims } from '../../utils/authClaims.js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

async function GreenProfileHandler(event) {
    try {
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: '',
            };
        }

        const requestId = event.pathParameters?.userId || event.pathParameters?.requestId;
        const claims = requireAuthClaims(event);
        const callerId = claims.sub;
        const callerRole = claims['custom:role'] || 'USER';

        const result = await getGreenProfile(requestId, callerId, callerRole, claims);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result),
        };
    } catch (err) {
        return {
            statusCode: err.statusCode || 500,
            headers: corsHeaders,
            body: JSON.stringify({
                errorCode: err.errorCode || 'INTERNAL_ERROR',
                message: err.message || 'Internal server error',
            }),
        };
    }
}

export const handler = GreenProfileHandler;
