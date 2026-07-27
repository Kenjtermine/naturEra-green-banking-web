export default {
    tableName: process.env.TABLE_NAME || 'NaturEraGreenBankingTable',
    redisEndpoint: process.env.REDIS_ENDPOINT,
    carbonQuotaLimit: Number(process.env.CARBON_QUOTA_LIMIT || 1000), // Giới hạn quota CO2 mặc định là 1000 kg
    // rewardThresholdKg: Number(process.env.REWARD_THRESHOLD || 0.3*carbonQuotaLimit),  Ngưỡng tích điểm thưởng mặc định là tiết kiệm 30% lượng CO2
    awsRegion: process.env.AWS_REGION || 'ap-southeast-1',
}