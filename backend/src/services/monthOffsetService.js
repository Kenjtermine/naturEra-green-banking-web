import { queryCurrentlyLockedUsers, queryUsersUnderQuotaForMonth, markUserRewarded, updateCardStatus } from '../repositories/accountRepo.js';
import getPreviousMonthYYYYMM from '../utils/dateHelper.js';
import config from '../configs/config.js';

/**
 * Tính reward dựa trên mức sử dụng CO2 so với ngưỡng thưởng.
 * Input: usagePercentage (0-100). Output: points.
 * Pure function — test riêng được, không phụ thuộc DB/AWS.
 */
function calculateReward(usagePercentage) {
    if (usagePercentage < 25) return 1000;
    if (usagePercentage < 50) return 750;
    if (usagePercentage < 75) return 500;
    return 250;
}

async function unlockAllCards() {
    const lockedUsers = await queryCurrentlyLockedUsers();
    await Promise.all(lockedUsers.map(async (user) => {
        // user.PK = USER#userId, user.SK = CARD#cardId
        const userId = user.PK.split('#')[1];
        const cardId = user.SK.split('#')[1];
        await updateCardStatus(userId, cardId, 'ACTIVE');
    }));
    return lockedUsers.length;
}

async function rewardUnderQuotaUsers() {
    // Bỏ `await` nếu getPreviousMonthYYYYMM là hàm thuần đồng bộ (kiểm tra lại
    // trong dateHelper.js) — giữ await ở đây không sai, chỉ dư thừa nếu vậy.
    const lastMonth = await getPreviousMonthYYYYMM();
    const underQuotaUsers = await queryUsersUnderQuotaForMonth(lastMonth);

    console.log(`[Reward] Tìm thấy ${underQuotaUsers.length} users dưới quota tháng ${lastMonth}`);
    const rewardThreshold = config.rewardThresholdKg || 250;
    let rewardedCount = 0;

    for (const userStat of underQuotaUsers) {
        // userStat KHÔNG có field userId — item STAT chỉ có PK/SK, trích từ PK.
        const userId = userStat.PK.split('#')[1];

        if (userStat.rewardedThisMonth) {
            console.log(`[Reward] User ${userId} đã nhận thưởng tháng này, bỏ qua`);
            continue;
        }

        await markUserRewarded(userId, lastMonth);

        const usagePercentage = (userStat.totalCo2Kg / rewardThreshold) * 100;
        const rewardAmount = calculateReward(usagePercentage);
        rewardedCount += 1;

        console.log(`[Reward] Tặng ${rewardAmount} điểm cho user ${userId} (sử dụng: ${usagePercentage.toFixed(2)}%)`);
    }

    return rewardedCount;
}

/** Entry point duy nhất — handler chỉ gọi đúng hàm này. */
async function monthlyOffsetBatch() {
    const [unlockedCount, rewardedCount] = await Promise.all([
        unlockAllCards(),
        rewardUnderQuotaUsers(),
    ]);

    return { unlockedCount, rewardedCount };
}

export default monthlyOffsetBatch;