import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import ddbClient from './ddbClient.js';
import config from '../configs/config.js';
import AppError from '../utils/AppError.js';

// Tối ưu Cache (DRY): Dùng 1 Object duy nhất để quản lý nhiều loại Config
const cache = {
    co2Rules: { data: null, lastFetch: 0 },
    mccMapping: { data: null, lastFetch: 0 }
};
const CACHE_TTL = 5 * 60 * 1000;


/**
 * Repo riêng cho vùng CONFIG#* — KHÔNG dùng chung file với accountRepo.js,
 * vì đây là bounded context khác (Admin/Staff, xem ADR-002), dù cùng 1 bảng
 * DynamoDB vật lý.
 */
async function getCo2Rules() { // Đổi tên hàm từ getCurrentRules thành getCo2Rules cho khớp Service
    const now = Date.now();
    
    if (cache.co2Rules.data && (now - cache.co2Rules.lastFetch < CACHE_TTL)) {
        return cache.co2Rules.data;
    }

    try {
        const result = await ddbClient.send(new GetCommand({
            TableName: config.tableName,
            Key: { PK: 'CONFIG#CO2_RULES', SK: 'CURRENT' },
        }));
        
        // Cập nhật Cache
        cache.co2Rules.data = result.Item?.rules || null;
        cache.co2Rules.lastFetch = now;
        
        return cache.co2Rules.data;
    } catch (err) {
        console.error('Error reading CO2 rules config:', err);
        // Fallback: Trả về cache cũ nếu DB lỗi
        if (cache.co2Rules.data) return cache.co2Rules.data;
        throw new AppError('FAILED_TO_READ_CONFIG', 'Không thể đọc cấu hình hệ số CO2', 500);
    }
}

async function saveCo2Rules(item) {
    try {
        await ddbClient.send(new PutCommand({ TableName: config.tableName, Item: item }));
        cache.co2Rules.lastFetch = 0; // Reset cache
    } catch (err) {
        console.error('Error saving CO2 rules config:', err);
        throw new AppError('FAILED_TO_SAVE_CONFIG', 'Không thể lưu cấu hình hệ số CO2', 500);
    }
}

async function getMccMapping() {
    const now = Date.now();
    
    if (cache.mccMapping.data && (now - cache.mccMapping.lastFetch < CACHE_TTL)) {
        return cache.mccMapping.data;
    }

    try {
        const result = await ddbClient.send(new GetCommand({
            TableName: config.tableName,
            Key: { PK: 'CONFIG#MCC_MAPPING', SK: 'CURRENT' },
        }));
        
        cache.mccMapping.data = result.Item?.mapping || null;
        cache.mccMapping.lastFetch = now;
        
        return cache.mccMapping.data;
    } catch (err) {
        console.error('Error reading MCC mapping config:', err);
        if (cache.mccMapping.data) return cache.mccMapping.data;
        throw new AppError('FAILED_TO_READ_CONFIG', 'Không thể đọc từ điển MCC', 500);
    }
}

async function saveMccMapping(item) {
    try {
        await ddbClient.send(new PutCommand({ TableName: config.tableName, Item: item }));
        cache.mccMapping.lastFetch = 0; // Reset cache
    } catch (err) {
        console.error('Error saving MCC mapping config:', err);
        throw new AppError('FAILED_TO_SAVE_CONFIG', 'Không thể lưu từ điển MCC', 500);
    }
}

export { getCo2Rules, saveCo2Rules, getMccMapping, saveMccMapping };
