import AppError from '../utils/AppError.js';

/**
 * Đúc dữ liệu của 1 Giao dịch theo contract frontend đang cần
 */
function buildTransactionDTO(rawTxn) {
    if (!rawTxn || typeof rawTxn !== 'object') return null;

    try {
        return {
            transaction_id: rawTxn.transactionId || 'UNKNOWN',
            timestamp: rawTxn.createdAt || new Date().toISOString(),
            type: 'debit',
            amount: Number(rawTxn.amount) || 0,
            merchant_name: rawTxn.merchantId || 'Merchant',
            mcc: rawTxn.mcc || null,
            co2_estimate: Number(rawTxn.co2Amount) || 0,
            description: rawTxn.description || rawTxn.merchantId || 'Transaction',
        };
    } catch (err) {
        console.error('Lỗi khi đúc Transaction DTO:', err);
        return null;
    }
}

/**
 * Đúc dữ liệu Thống kê tháng
 */
function buildStatDTO(rawStat) {
    if (!rawStat || typeof rawStat !== 'object') return null;

    try {
        // Cắt 'STAT#' một cách an toàn
        const statMonthStr = (rawStat.SK && typeof rawStat.SK === 'string') 
            ? rawStat.SK.replace('STAT#', '') 
            : 'UNKNOWN';

        return {
            statMonth: statMonthStr,
            totalCo2Amount: Number(rawStat.totalCo2Kg) || 0,
            categoryBreakdown: Array.isArray(rawStat.categories) ? rawStat.categories : []
        };
    } catch (err) {
        console.error('Lỗi khi đúc Stat DTO:', err);
        throw new AppError('INVALID_STAT_FORMAT', 'Lỗi định dạng dữ liệu thống kê', 500);
    }
}

/**
 * Factory tổng hợp Response
 */
function buildDashboardResponse(rawStat, rawTransactions) {
    const statDTO = buildStatDTO(rawStat);
    
    // Đảm bảo truyền vào là mảng, map qua từng phần tử, và loại bỏ các phần tử bị lỗi (null)
    const txnsArray = Array.isArray(rawTransactions) ? rawTransactions : [];
    const transactionDTOs = txnsArray
        .map(txn => buildTransactionDTO(txn))
        .filter(dto => dto !== null);

    return {
        status: "SUCCESS",
        message: "Lấy dữ liệu Dashboard thành công",
        data: {
            chartData: statDTO || { statMonth: "", totalCo2Amount: 0, categoryBreakdown: [] },
            recentTransactions: transactionDTOs
        }
    };
}

export { buildTransactionDTO };
export default buildDashboardResponse;