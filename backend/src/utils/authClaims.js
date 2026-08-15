function decodeJwtPayload(token) {
    const [, payload] = token.split('.');
    if (!payload) return {};

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

function getBearerToken(event) {
    const headers = event.headers || {};
    const authorization = headers.Authorization || headers.authorization;
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    return match?.[1];
}

function getAuthClaims(event) {
    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.jwt?.claims || authorizer?.claims;
    if (claims && Object.keys(claims).length > 0) return claims;

    if (process.env.AWS_SAM_LOCAL === 'true') {
        const token = getBearerToken(event);
        if (!token) return {};
        try {
            return decodeJwtPayload(token);
        } catch (err) {
            console.warn('Failed to decode local JWT payload:', err);
            return {};
        }
    }

    return {};
}

function requireAuthClaims(event) {
    const claims = getAuthClaims(event);
    if (!claims.sub) {
        const error = new Error('Unauthorized');
        error.errorCode = 'UNAUTHORIZED';
        error.statusCode = 401;
        throw error;
    }
    return claims;
}

export { getAuthClaims, requireAuthClaims };
