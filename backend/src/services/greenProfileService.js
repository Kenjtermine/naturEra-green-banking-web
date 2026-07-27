
async function getGreenProfile(userId) {
    // 1. Kiểm tra đầu vào
    if (!userId) {
        throw new Error("Dữ liệu đầu vào không hợp lệ. Thiếu userId.");
    }

    // ==========================================
    // 2. MOCK DATA
    // (Sau này sẽ thay  const profile = await accountRepository.getUserProfile(userId);)
    const mockProfile = {
        userId: userId,
        fullName: "Khách hàng Tiêu chuẩn",
        currentCarbon: 75,
        carbonQuota: 100,
        savedCarbon: 25,     
        level: "Eco Rookie"  
    };
    // ==========================================

    return {
        status: "SUCCESS",
        message: "Lấy thông tin Green Profile thành công",
        data: mockProfile
    };
}

module.exports = {
    getGreenProfile
};