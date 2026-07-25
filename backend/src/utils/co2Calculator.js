// const getCurrentRules = require('../repositories/ruleConfigRepo');

/**
 * Hàm tính toán CO2 dựa trên MCC và Số tiền
 */
async function calculateCO2(mcc, amount) {
    // ==========================================
    // MOCK DATA: Tự tạo bộ quy tắc hệ số CO2 giả
    const rules = {
        "COFFEE_SHOP": 0.5,   // Uống cafe nhân hệ số 0.5
        "SUPERMARKET": 1.2,   // Đi siêu thị nhân hệ số 1.2
        "default": 1.0        // Mặc định nhân 1
    };
    // ==========================================
    
    const coefficient = rules[mcc] ? rules[mcc] : rules["default"];
    const co2Amount = amount * coefficient;
    
    return co2Amount;
}

module.exports = calculateCO2;