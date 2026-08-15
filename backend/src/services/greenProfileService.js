import AppError from '../utils/AppError.js';
import { getUserProfile, getUserCard, putUserProfile } from '../repositories/accountRepo.js';
async function getGreenProfile(requestedId, callerId, callerRole, claims = {}) { // Chỉ user là không đủ theo ADR-004
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
    let profile = null;
    let card = null;

    // Cố gắng lấy Profile
    try {
        profile = await getUserProfile(requestedId);
    } catch (err) {
        // Nếu là lỗi 404 (Không tìm thấy), ta ngó lơ để profile = null. Lỗi khác thì ném ra tiếp.
        if (err.statusCode !== 404 && err.errorCode !== 'USER_NOT_FOUND') {
            throw err; 
        }
    }

    // Cố gắng lấy Thẻ
    try {
        card = await getUserCard(requestedId);
    } catch (err) {
        if (err.statusCode !== 404) throw err;
    }

    if (!profile) {
        profile = await putProfileHelper(requestedId, claims);
    }

    return {
        ...profile,
        cardId: card?.cardId || 'unknown_card',
    };
}

async function putProfileHelper(callerId, claims) {
    const yyyyMM = new Date().toISOString().slice(0, 7);
    // Hàm chỉ được gọi bởi chính chủ khi lập tài khoản
    const email = claims.email;
    const name = claims.name || "Thành viên NaturEra";

    const newProfile = {
        profileData: {
            PK: `USER#${callerId}`,
            SK: "PROFILE",
            userId: callerId,
            fullName: name,
            email: email,
            balance: 0,
            currency: "VND",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        statsData: {
            PK: `USER#${callerId}`,
            SK: `STAT#${yyyyMM}`,
            StatMonth: yyyyMM,
            totalCo2Kg: 0,
            carbonQuotaLimitKg: 1000,
            rewardedThisMonth: 'false',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },  
    };

    await putUserProfile(callerId, newProfile);

    return {
        ...newProfile.profileData,
    };
}

export default getGreenProfile;
