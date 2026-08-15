import AppError from '../utils/AppError.js';
import buildDashboardResponse, { buildTransactionDTO } from '../models/dashboardModel.js';
import getCategoryFromMcc from '../utils/CategoryMap.js';
import {
    getMonthlyStat,
    getRecentTransactions,
    getTransactionsForMonth,
    getUserProfile,
    getUserCard,
} from '../repositories/accountRepo.js';

async function getDashboardData(userId) {
    // 1. Validate Input
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new AppError('INVALID_INPUT', 'Dữ liệu đầu vào không hợp lệ. Thiếu userId.', 400);
    }

    // 2. Tính toán tháng hiện tại (Có xử lý Timezone VN UTC+7)
    const now = new Date();
    const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const currentMonthYyyyMm = vnTime.toISOString().slice(0, 7); 

    try {
        // 3. Gọi Tầng Repo lấy dữ liệu (Chạy song song 4 hàm)
        const [dbStat, allTxnsThisMonth, recentTxns, userProfile, userCard] = await Promise.all([
            getMonthlyStat(userId, currentMonthYyyyMm),
            getTransactionsForMonth(userId, currentMonthYyyyMm),
            getRecentTransactions(userId, 5),
            getUserProfile(userId),
            getUserCard(userId),
        ]);

        // 4. Tính categoryBreakdown từ TOÀN BỘ giao dịch tháng
        const categorySumMap = {};

        allTxnsThisMonth.forEach((txn) => {
            if (txn.status === 'APPROVED' && txn.co2Amount > 0) {
                const categoryName = getCategoryFromMcc(txn.mcc);
                if (!categorySumMap[categoryName]) {
                    categorySumMap[categoryName] = 0;
                }
                categorySumMap[categoryName] += Number(txn.co2Amount);
            }
        });

        const calculatedCategories = Object.keys(categorySumMap).map(key => {
            return {
                categoryName: key,
                co2Amount: Number(categorySumMap[key].toFixed(2)), 
            };
        });

        // 5. Gắn category breakdown vào dbStat
        dbStat.categories = calculatedCategories;

        const formattedResponse = buildDashboardResponse(dbStat, recentTxns);

        // 7. Gắn thêm data cho Frontend lên hình đầy đủ
        formattedResponse.balance = userProfile?.balance || 0;
        formattedResponse.cardId = userCard?.cardId || userProfile?.cardId || 'card_001';
        formattedResponse.transactions = (allTxnsThisMonth || [])
            .map(buildTransactionDTO)
            .filter(Boolean);
        formattedResponse.carbonCredit = {
            total_co2_kg: dbStat?.totalCo2Kg || 0,
            green_points: dbStat?.greenPoints || 0,
            rank: dbStat?.rank || "Bậc đồng"
        };

        return formattedResponse;
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Lỗi sập ngầm khi lấy Dashboard Data:", err);
        throw new AppError("DASHBOARD_FETCH_ERROR", "Đã xảy ra lỗi khi tải dữ liệu tổng quan", 500);
    }
}

export default getDashboardData;