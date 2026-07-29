const carbonQuotaLimitKg = Number(process.env.CARBON_QUOTA_LIMIT || 1000);
const rewardThresholdKg = Number(process.env.REWARD_THRESHOLD || 300);

export default {
    tableName: process.env.TABLE_NAME || 'NaturEraGreenBankingTable',
    redisEndpoint: process.env.REDIS_ENDPOINT,
    carbonQuotaLimitKg,
    carbonQuotaLimit: carbonQuotaLimitKg,
    rewardThresholdKg,
    awsRegion: process.env.AWS_REGION || 'ap-southeast-2',
};
