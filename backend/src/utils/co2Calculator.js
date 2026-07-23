// Biến toàn cục này chính là "localStorage" của Back-end!
// Nó sẽ nằm trên RAM của AWS Lambda.
import getCurrentRules from '../repositories/ruleConfigRepo';

/**
 * Hàm tính toán CO2 dựa trên MCC và Số tiền
 */
async function calculateCO2(mcc, amount) {
    const rules = await getCurrentRules();
    
    const coefficient = rules[mcc] ? rules[mcc] : rules["default"];
    
    const co2Amount = amount * coefficient;
    
    return co2Amount;
}

export default calculateCO2;