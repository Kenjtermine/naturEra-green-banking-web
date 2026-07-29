import AppError from '../utils/AppError.js';
import { getUserProfile } from '../repositories/accountRepo.js';
async function getGreenProfile(requestedId, callerId, callerRole) { // Chỉ user là không đủ theo ADR-004
    // 1. Kiểm tra đầu vào
    const isOwner = callerId === requestedId;
    const isAdmin = callerRole === "ADMIN";

    if (!isOwner && !isAdmin) { // Không phải COCC -> GET OUT!
        throw new AppError("FORBIDDEN_ACCESS", "Bạn không có quyền truy cập thông tin hồ sơ của người dùng này", 403);
    }

    // ==========================================
    // 2. MOCK DATA
    // (Sau này sẽ thay  const profile = await accountRepository.getUserProfile(userId);)
    // const mockProfile = {
    //     userId: userId,
    //     fullName: "Khách hàng Tiêu chuẩn",
    //     currentCarbon: 75,
    //     carbonQuota: 100,
    //     savedCarbon: 25,     
    //     level: "Eco Rookie"  
    // };
    // ==========================================
    const profile = await getUserProfile(requestedId);

    if (!profile) {
        throw new AppError("USER_NOT_FOUND", `Không tìm thấy thông tin hồ sơ của người dùng ${requestedId}`, 404);
    }

    return profile;
}

export default getGreenProfile;
