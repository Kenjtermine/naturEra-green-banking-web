export default {
    tableName: process.env.DYNAMODB_TABLE_NAME,
    redisEndpoint: process.env.REDIS_ENDPOINT,
    carbonQuotaLimit: Number(process.env.CARBON_QUOTA_LIMIT || 1000), // Giới hạn quota CO2 mặc định là 1000 kg
    awsRegion: process.env.AWS_REGION || 'ap-southeast-1',
}