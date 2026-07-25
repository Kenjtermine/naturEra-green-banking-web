// const accountRepository = require('../repositories/accountRepository');
const calculateCO2 = require('../utils/co2Calculator'); 

async function processTransaction(body) {
    const { userId, amount, merchantCategory } = body;

    // Bắt lỗi nếu Frontend gửi thiếu dữ liệu
    if (!userId || !amount || !merchantCategory) {
        throw new Error("Dữ liệu đầu vào không hợp lệ.");
    }

    // ==========================================
    // 1. Phân loại giao dịch 
    if (merchantCategory === 'P2P_TRANSFER' || merchantCategory === 'PERSONAL') {
        console.log("Đây là giao dịch chuyển tiền cá nhân. Bỏ qua tính CO2.");
        

        return {
            status: "SUCCESS",
            message: "Chuyển tiền thành công (Không tính CO2)",
            data: { 
                transactionCarbon: 0 
            }
        };
    }
    // ==========================================

    // 2. Nếu là mua hàng quán (COFFEE_SHOP, SUPERMARKET...), tính điểm CO2 
    const carbonPoint = await calculateCO2(merchantCategory, amount);

    // ==========================================
    // 3. MOCK DATA: Tự tạo dữ liệu hồ sơ khách hàng để test
    const userProfile = {
        userId: userId,
        currentCarbon: 75, 
        carbonQuota: 100   
    };
    // ==========================================

    // 4. Tính toán tổng lượng CO2 mới
    const newTotalCarbon = userProfile.currentCarbon + carbonPoint;
    const quotaThreshold = userProfile.carbonQuota * 0.85; // Ngưỡng 85%

    // 5. Kiểm tra xem có vượt 85% không
    let isWarning = false;
    if (newTotalCarbon >= quotaThreshold) {
        isWarning = true;
        console.log("🚨 BÁO ĐỘNG: Khách hàng đã vượt ngưỡng 85% CO2!");
    }

    // 6. Trả kết quả về cho file Lambda.js
    return {
        status: "SUCCESS",
        message: "Thanh toán thành công",
        warning: isWarning ? "Cảnh báo: Bạn đã vượt quá 85% hạn mức xả thải CO2!" : null,
        data: {
            transactionCarbon: carbonPoint,
            newTotalCarbon: newTotalCarbon
        }
    };
}

module.exports = {
    processTransaction
};