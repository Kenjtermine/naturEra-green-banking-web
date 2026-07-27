import { GetCommand } from '@aws-sdk/lib-dynamodb';
import ddbClient from './ddbClient';
import config from '../configs/config';
import AppError from '../utils/AppError';

let cachedCo2Rules = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // Thời gian sống của cache (5 phút)

/**
 * Hàm lấy cấu hình từ Database (Có dùng Cache)
 */
async function getCurrentRules() {
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
    // const freshRulesFromDB = {
    //     default: 0.00001,
    //     5411: 0.00005,
    //     4511: 0.00002,
    //     5812: 0.00003,
    //     5813: 0.00006,
    //     5814: 0.00003,
    // };
    try {
        const result = await ddbClient.send(new GetCommand({
            TableName: config.tableName,
            Key: { PK: 'CONFIG#CO2_RULES' , SK: 'CONFIG'},
        }));
        
        if (!result.Item) {
            return { default: 0.00001 };
        }
        // Lưu vào biến Cache để các giao dịch sau dùng ké
        cachedCo2Rules = result.Item;
        lastFetchTime = now;

        return cachedCo2Rules;
    } catch (error) {
        console.error("Lỗi khi lấy cấu hình CO2 từ DynamoDB:", error);
        throw new AppError('CONFIG_NOT_FOUND', 'Không tìm thấy cấu hình CO2', 500);
    }
}

export default getCurrentRules;