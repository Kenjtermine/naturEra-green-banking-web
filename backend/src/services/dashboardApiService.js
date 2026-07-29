import AppError from '../utils/AppError.js';
import buildDashboardResponse from '../models/dashboardModel.js';
import getCategoryFromMcc from '../utils/CategoryMap.js';
import {
    getMonthlyStat,
    getRecentTransactions,
    getTransactionsForMonth,
} from '../repositories/accountRepo.js';

async function getDashboardData(userId) {
    // 1. Validate Input (Clean ID từ Handler đưa xuống)
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new AppError('INVALID_INPUT', 'Dữ liệu đầu vào không hợp lệ. Thiếu userId.', 400);
    }

    // 2. Tính toán tháng hiện tại (Có xử lý Timezone VN UTC+7)
    const now = new Date();
    // Chuyển giờ hiện tại của Server (có thể là UTC) sang giờ VN để lấy YYYY-MM cho đúng
    const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const currentMonthYyyyMm = vnTime.toISOString().slice(0, 7); // Ra đúng "2026-07" theo giờ VN

    try {
        // 3. Gọi Tầng Repo lấy dữ liệu (Chạy song song để tối ưu tốc độ)
        // ⚠️ 3 queries riêng biệt:
        //   - getMonthlyStat: totalCo2Kg atomic (tính từ mọi txn tháng)
        //   - getTransactionsForMonth: FULL list giao dịch tháng (để tính categoryBreakdown)
        //   - getRecentTransactions: chỉ 5 giao dịch gần nhất (để hiển thị recent)
        const [dbStat, allTxnsThisMonth, recentTxns] = await Promise.all([
            getMonthlyStat(userId, currentMonthYyyyMm),
            getTransactionsForMonth(userId, currentMonthYyyyMm),
            getRecentTransactions(userId, 5),
        ]);

        // 4. Tính categoryBreakdown từ TOÀN BỘ giao dịch tháng (KHÔNG phải 5 record)
        const categorySumMap = {};

        allTxnsThisMonth.forEach((txn) => {
            // Chỉ tính CO2 cho những giao dịch thành công và có sinh CO2
            if (txn.status === 'APPROVED' && txn.co2Amount > 0) {
                // Dịch mã MCC của hóa đơn này sang Category Name
                const categoryName = getCategoryFromMcc(txn.mcc);

                // Nếu trong sổ nháp chưa có tên danh mục này thì khởi tạo = 0
                if (!categorySumMap[categoryName]) {
                    categorySumMap[categoryName] = 0;
                }

                // Cộng dồn lượng CO2 của hóa đơn này vào danh mục tương ứng
                categorySumMap[categoryName] += Number(txn.co2Amount);
            }
        });


        // Biến cuốn "sổ tay" thành mảng Array đúng chuẩn Frontend cần
        const calculatedCategories = Object.keys(categorySumMap).map(key => {
            return {
                categoryName: key,
                co2Amount: Number(categorySumMap[key].toFixed(2)), // Giữ 2 số thập phân
            };
        });

        // 5. Gắn category breakdown vào dbStat (sẽ được model transform)
        dbStat.categories = calculatedCategories;

        // 6. Bọc qua DTO Model để ép chuẩn Response
        const formattedResponse = buildDashboardResponse(dbStat, recentTxns);

        return formattedResponse;
    } catch (err) {
        // Nếu lỗi do Repo ném lên (AppError), ném tiếp lên Handler
        if (err instanceof AppError) throw err;

        // Nếu là lỗi lạ (như đứt cáp, sập DB), bọc lại thành AppError chuẩn
        console.error("Lỗi sập ngầm khi lấy Dashboard Data:", err);
        throw new AppError("DASHBOARD_FETCH_ERROR", "Đã xảy ra lỗi khi tải dữ liệu tổng quan", 500);
    }
}

export default getDashboardData;