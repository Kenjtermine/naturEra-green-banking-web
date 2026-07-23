// Biến toàn cục này chính là "localStorage" của Back-end!
// Nó sẽ nằm trên RAM của AWS Lambda.
import getConfigRule from '../services/adminConfigService';
let cachedCo2Rules = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // Thời gian sống của cache (5 phút)

/**
 * Hàm lấy cấu hình từ Database (Có dùng Cache)
 */
async function getCo2RulesConfig() {
    const now = Date.now();
    

    if (cachedCo2Rules && (now - lastFetchTime < CACHE_TTL)) {
        console.log("Lấy cấu hình CO2 từ RAM (Cache)...");
        return cachedCo2Rules;
    }

    console.log("Cache trống hoặc hết hạn. Đang tải cấu hình từ DynamoDB...");
    
    // Giả lập lệnh gọi DynamoDB lấy config
    // Lệnh này sẽ lấy chính xác cục data mà hàm updateCo2Rules() của Admin vừa lưu ở trên
    // const result = await dynamoDB.get({ TableName: 'SystemConfigs', Key: { id: 'CO2_RULES' } }).promise();
    
    // Dữ liệu giả lập lấy từ DB
    const freshRulesFromDB = await getConfigRule();

    // Lưu vào biến Cache để các giao dịch sau dùng ké
    cachedCo2Rules = freshRulesFromDB;
    lastFetchTime = now;

    return cachedCo2Rules;
}

/**
 * Hàm tính toán CO2 dựa trên MCC và Số tiền
 */
async function calculateCO2(mcc, amount) {
    const rules = await getCo2RulesConfig();
    
    const coefficient = rules[mcc] ? rules[mcc] : rules["default"];
    
    const co2Amount = amount * coefficient;
    
    return co2Amount;
}

export default calculateCO2;