import { getCo2Rules } from '../repositories/ruleConfigRepo.js';
import AppError from './AppError.js';

/**
 * Hàm tính toán CO2 dựa trên MCC và Số tiền
 */
async function calculateCO2(amount, mcc) {
    const rules = await getCo2Rules();
    if (!rules || typeof rules !== 'object' || typeof rules.default !== 'number') {
        throw new AppError('CONFIG_NOT_FOUND', 'Chua co cau hinh he so CO2 mac dinh', 500);
    }
    
    const coefficient = rules[mcc] ? rules[mcc] : rules["default"];
    const co2Amount = amount * coefficient;
    
    return co2Amount;
}

export default calculateCO2;
