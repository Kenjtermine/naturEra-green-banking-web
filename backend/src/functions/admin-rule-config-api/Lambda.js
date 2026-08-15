import {
    updateCo2RulesService,
    getCo2RulesService,
    updateMccMappingService,
    getMccMappingService,
} from '../../services/adminConfigService.js';
import { requireAuthClaims } from '../../utils/authClaims.js';

/**
 * Admin Rule Config Lambda — 4 route qua 1 handler:
 *   GET  /admin/config/co2-rules
 *   PUT  /admin/config/co2-rules
 *   GET  /admin/config/mcc-mapping
 *   PUT  /admin/config/mcc-mapping
 *
 * Auth: API Gateway Cognito Authorizer (Staff Pool) xác thực TRƯỚC khi request
 * tới đây — claims được inject vào event.requestContext.authorizer.claims.
 * callerRole lấy từ 'custom:role' — KHÔNG BAO GIỜ suy role từ định dạng/tiền tố
 * của callerId (bài học RBAC: ID để định danh, role để phân quyền).
 */

function respond(statusCode, payload) {
    return { statusCode, body: JSON.stringify(payload) };
}

async function adminConfigHandler(event) {
  try {
    const claims = requireAuthClaims(event);
    const callerRole = claims['custom:role'];
    const callerId = claims['sub'];
    const path = event.resource || event.path || '';
    const method = event.httpMethod;

    if (path.includes('mcc-mapping')) {
        if (method === 'GET') {
            return respond(200, await getMccMappingService(callerRole));
        }
        if (method === 'PUT') {
            const body = JSON.parse(event.body || '{}');
            return respond(200, await updateMccMappingService(callerRole, callerId, body));
        }
    }

    if (path.includes('co2-rules')) {
        if (method === 'GET') {
            return respond(200, await getCo2RulesService(callerRole));
        }
        if (method === 'PUT') {
            const body = JSON.parse(event.body || '{}');
            return respond(200, await updateCo2RulesService(callerRole, callerId, body));
        }
    }

    return respond(404, { errorCode: 'ROUTE_NOT_FOUND', message: `Không tìm thấy route: ${method} ${path}` });
  } catch (err) {
    return respond(err.statusCode || 500, { errorCode: err.errorCode, message: err.message });
  }
}

export const handler = adminConfigHandler;
