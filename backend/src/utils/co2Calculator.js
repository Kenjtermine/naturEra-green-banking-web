const getCurrentRules = require('../repositories/ruleConfigRepo');

/**
 * Hàm tính toán CO2 dựa trên MCC và Số tiền
 */
async function calculateCO2(amount, mcc) {
    const rules = await getCurrentRules();
    
    const coefficient = rules[mcc] ? rules[mcc] : rules["default"];
    const co2Amount = amount * coefficient;
    
    return co2Amount;
}

module.exports = calculateCO2;