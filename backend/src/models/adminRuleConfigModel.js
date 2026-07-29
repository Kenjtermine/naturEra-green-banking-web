import AppError from '../utils/AppError.js';

/**
 * Validate payload khi Admin cập nhật hệ số CO2 theo MCC.
 * Bắt buộc có key "default" — dùng khi gặp MCC lạ chưa có trong bảng.
 */
function validateCo2RulesInput(body) {
    if (!body || typeof body !== 'object' || typeof body.rules !== 'object' || Array.isArray(body.rules)) {
        throw new AppError('VALIDATION_ERROR', 'Thiếu hoặc sai định dạng field "rules" (phải là object)', 400);
    }
    const { rules } = body;
    if (!('default' in rules)) {
        throw new AppError('VALIDATION_ERROR', 'rules phải có key "default" (áp dụng cho MCC không xác định)', 400);
    }
    for (const [mcc, coefficient] of Object.entries(rules)) {
        if (typeof coefficient !== 'number' || coefficient < 0 || Number.isNaN(coefficient)) {
            throw new AppError('VALIDATION_ERROR', `Hệ số CO2 cho "${mcc}" phải là số >= 0`, 400);
        }
    }
    return rules;
}

function buildCo2RulesItem(rules, updatedBy) {
    return {
        PK: 'CONFIG#CO2_RULES',
        SK: 'CURRENT',
        rules,
        updatedAt: new Date().toISOString(),
        updatedBy,
    };
}

/** Validate payload khi Admin cập nhật từ điển MCC -> tên danh mục hiển thị. */
function validateMccMappingInput(body) {
    if (!body || typeof body !== 'object' || typeof body.mapping !== 'object' || Array.isArray(body.mapping)) {
        throw new AppError('VALIDATION_ERROR', 'Thiếu hoặc sai định dạng field "mapping" (phải là object)', 400);
    }
    for (const [mcc, categoryName] of Object.entries(body.mapping)) {
        if (typeof categoryName !== 'string' || categoryName.trim() === '') {
            throw new AppError('VALIDATION_ERROR', `Tên danh mục cho "${mcc}" phải là chuỗi không rỗng`, 400);
        }
    }
    return body.mapping;
}

function buildMccMappingItem(mapping, updatedBy) {
    return {
        PK: 'CONFIG#MCC_MAPPING',
        SK: 'CURRENT',
        mapping,
        updatedAt: new Date().toISOString(),
        updatedBy,
    };
}

export {
    validateCo2RulesInput,
    buildCo2RulesItem,
    validateMccMappingInput,
    buildMccMappingItem,
};