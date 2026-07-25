async function getDashboardData(userId) {
    if (!userId) {
        throw new Error("Dữ liệu đầu vào không hợp lệ. Thiếu userId.");
    }

    // ==========================================
    // MOCK DATA
    // ==========================================

    // 1. Dữ liệu cho biểu đồ (Ví dụ: Thống kê CO2 theo tuần hoặc theo danh mục)
    const mockChartData = [
        { category: "COFFEE_SHOP", totalCarbon: 150 },
        { category: "SUPERMARKET", totalCarbon: 320 },
        { category: "TRANSPORT", totalCarbon: 450 }
    ];

    // 2. Dữ liệu danh sách lịch sử giao dịch (Hiển thị dạng bảng/list)
    const mockRecentTransactions = [
        {
            transactionId: "TXN001",
            date: "2026-07-25T08:30:00Z",
            amount: 55000,
            merchantCategory: "COFFEE_SHOP",
            carbonPoint: 27.5
        },
        {
            transactionId: "TXN002",
            date: "2026-07-24T18:15:00Z",
            amount: 1500000,
            merchantCategory: "SUPERMARKET",
            carbonPoint: 180
        },
        {
            transactionId: "TXN003",
            date: "2026-07-23T12:00:00Z",
            amount: 200000,
            merchantCategory: "P2P_TRANSFER",
            carbonPoint: 0 
        }
    ];

    return {
        status: "SUCCESS",
        message: "Lấy dữ liệu Dashboard thành công",
        data: {
            chartData: mockChartData,
            recentTransactions: mockRecentTransactions
        }
    };
}

module.exports = {
    getDashboardData
};