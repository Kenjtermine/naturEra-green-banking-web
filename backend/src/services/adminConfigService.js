import AppError from '../utils/AppError.js';
import {
    validateCo2RulesInput,
    buildCo2RulesItem,
    validateMccMappingInput,
    buildMccMappingItem,
} from '../models/adminRuleConfigModel.js';
import { getCo2Rules, saveCo2Rules, getMccMapping, saveMccMapping } from '../repositories/ruleConfigRepo.js';

const READ_ROLES = ['ADMIN', 'MANAGER', 'TELLER'];
const WRITE_ROLES = ['ADMIN']; // Chỉ Admin được sửa — không suy role từ ID, đọc từ Cognito claim

function assertRole(callerRole, allowedRoles, action) {
    if (!allowedRoles.includes(callerRole)) {
        throw new AppError('FORBIDDEN', `Không có quyền ${action} — yêu cầu role: ${allowedRoles.join('/')}`, 403);
    }
}

async function updateCo2RulesService(callerRole, callerId, body) {
    assertRole(callerRole, WRITE_ROLES, 'sửa hệ số CO2');
    const rules = validateCo2RulesInput(body);
    const item = buildCo2RulesItem(rules, callerId);
    await saveCo2Rules(item);
    return { message: 'Cập nhật hệ số CO2 thành công', rules, updatedAt: item.updatedAt };
}

async function getCo2RulesService(callerRole) {
    assertRole(callerRole, READ_ROLES, 'xem hệ số CO2');
    const rules = await getCo2Rules();
    if (!rules) {
        throw new AppError('CONFIG_NOT_FOUND', 'Chưa có cấu hình hệ số CO2 nào được thiết lập', 404);
    }
    return { rules };
}

async function updateMccMappingService(callerRole, callerId, body) {
    assertRole(callerRole, WRITE_ROLES, 'sửa từ điển MCC');
    const mapping = validateMccMappingInput(body);
    const item = buildMccMappingItem(mapping, callerId);
    await saveMccMapping(item);
    return { message: 'Cập nhật từ điển MCC thành công', mapping, updatedAt: item.updatedAt };
}

async function getMccMappingService(callerRole) {
    assertRole(callerRole, READ_ROLES, 'xem từ điển MCC');
    const mapping = await getMccMapping();
    if (!mapping) {
        throw new AppError('CONFIG_NOT_FOUND', 'Chưa có từ điển MCC nào được thiết lập', 404);
    }
    return { mapping };
}

export {
    updateCo2RulesService,
    getCo2RulesService,
    updateMccMappingService,
    getMccMappingService,
};
