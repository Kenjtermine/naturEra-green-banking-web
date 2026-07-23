import AppError from '../utils/AppError';

async function getConfigRule() {
    return {
        default: 0.00001,
        5411: 0.00005,
        4511: 0.00002,
        5812: 0.00003,
        5813: 0.00006,
        5814: 0.00003,
    }
    // tạm thời hardcode, sau này sẽ lấy từ DynamoDB
}

export default getConfigRule;