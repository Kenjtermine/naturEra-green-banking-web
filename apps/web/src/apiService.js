// ╔══════════════════════════════════════════════════════════════════╗
// ║  apiService.js — Toàn bộ HTTP calls tập trung ở đây             ║
// ║  Mỗi hàm: mock mode khi IS_MOCK=true, gọi thật khi có API URL   ║
// ╚══════════════════════════════════════════════════════════════════╝
import { ENDPOINTS, COGNITO_CONFIG, IS_MOCK, MERCHANT_API_KEY } from "./config.js";

// ─── Helper: build Authorization header ───────────────────────────
function authHeader(jwtToken) {
  return {
    "Content-Type"  : "application/json",
    "Authorization" : `Bearer ${jwtToken}`,
  };
}

// ─── Helper: throw nếu response không OK ──────────────────────────
async function handleResponse(res) {
  if (res.ok) return res.json();
  const body = await res.json().catch(() => ({}));
  throw new Error(body.message || `HTTP ${res.status}`);
}

// ══════════════════════════════════════════════════════════════════
//  AUTH — AWS Cognito (gọi thẳng REST, không cần Amplify SDK)
// ══════════════════════════════════════════════════════════════════
export const CognitoAuth = {
  /**
   * Đăng nhập
   * Trả về { idToken, accessToken, refreshToken }
   * ── Để dùng thật: điền COGNITO_CONFIG trong config.js ──
   */
  async signIn(username, password) {
    if (IS_MOCK) {
      await delay(1100);
      if (password.length < 4) throw new Error("Sai mật khẩu. Vui lòng thử lại.");
      return {
        idToken      : "eyJhbGciOiJSUzI1NiJ9.MOCK.SIG",
        accessToken  : "eyJhbGciOiJSUzI1NiJ9.ACCESS.SIG",
        refreshToken : "MOCK_REFRESH_TOKEN",
      };
    }
    // ── THẬT ──
    const res = await fetch(COGNITO_CONFIG.endpoint, {
      method  : "POST",
      headers : {
        "Content-Type" : "application/x-amz-json-1.1",
        "X-Amz-Target" : "AWSCognitoIdentityProviderService.InitiateAuth",
      },
      body: JSON.stringify({
        AuthFlow       : "USER_PASSWORD_AUTH",
        ClientId       : COGNITO_CONFIG.clientId,
        AuthParameters : { USERNAME: username, PASSWORD: password },
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Đăng nhập thất bại"); }
    const data = await res.json();
    return {
      idToken      : data.AuthenticationResult.IdToken,
      accessToken  : data.AuthenticationResult.AccessToken,
      refreshToken : data.AuthenticationResult.RefreshToken,
    };
  },

  async signUp(username, password, email) {
    if (IS_MOCK) { await delay(900); return { userSub: "mock-sub-" + Date.now() }; }
    const res = await fetch(COGNITO_CONFIG.endpoint, {
      method  : "POST",
      headers : { "Content-Type":"application/x-amz-json-1.1", "X-Amz-Target" : "AWSCognitoIdentityProviderService.SignUp" },
      body    : JSON.stringify({ ClientId:COGNITO_CONFIG.clientId, Username:username, Password:password, UserAttributes:[{Name:"email",Value:email}, {Name: "name", Value: username}] }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    return res.json();
  },

  async confirmSignUp(username, code) {
    if (IS_MOCK) { await delay(800); return true; }
    
    const res = await fetch(COGNITO_CONFIG.endpoint, {
      method  : "POST",
      headers : { "Content-Type":"application/x-amz-json-1.1", "X-Amz-Target" : "AWSCognitoIdentityProviderService.ConfirmSignUp" },
      body    : JSON.stringify({ 
        ClientId: COGNITO_CONFIG.clientId, 
        Username: username, 
        ConfirmationCode: code 
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Mã xác nhận không đúng"); }
    return res.json();
  },
  signOut() {
    sessionStorage.removeItem("naturera_jwt");
  },
};

// ══════════════════════════════════════════════════════════════════
//  CUSTOMER API — Read-only (Customer Portal)
// ══════════════════════════════════════════════════════════════════

/**
 * GET /users/{userId}/profile
 * Trả về: { userId, fullName, email, balance, currency, createdAt, updatedAt }
 */
export async function fetchCustomerProfile(userId, jwtToken) {
  if (IS_MOCK) {
    await delay(400);
    return {
      userId,
      fullName: "NaturEra Demo User",
      email: "demo@naturera.local",
      balance: 10_000_000,
      currency: "VND",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return handleResponse(await fetch(ENDPOINTS.getProfile(userId), { headers: authHeader(jwtToken) }));
}

/**
 * GET /accounts/{cardId}/balance
 * Trả về: { card_id, balance, currency, updated_at }
 */
export async function fetchBalance(cardId, jwtToken) {
  if (IS_MOCK) {
    await delay(600);
    return { card_id: cardId, balance: 10_000_000, currency: "VND", updated_at: new Date().toISOString() };
  }
  return handleResponse(await fetch(ENDPOINTS.getBalance(cardId), { headers: authHeader(jwtToken) }));
}

/**
 * GET /users/{userId}/transactions?limit=20&offset=0
 * Trả về: { items: [{ transaction_id, timestamp, type, amount, merchant_name, mcc, co2_estimate, description }], total }
 */
export async function fetchTransactions(userId, jwtToken, { limit = 20, offset = 0 } = {}) {
  if (IS_MOCK) {
    await delay(700);
    return {
      total: MOCK_TRANSACTIONS.length,
      items: MOCK_TRANSACTIONS,
    };
  }
  const url = `${ENDPOINTS.getTransactions(userId)}?limit=${limit}&offset=${offset}`;
  return handleResponse(await fetch(url, { headers: authHeader(jwtToken) }));
}

/**
 * GET /users/{userId}/carbon-credits
 * Trả về: { user_id, total_co2_kg, green_points, rank, monthly_breakdown }
 */
export async function fetchCarbonCredit(userId, jwtToken) {
  if (IS_MOCK) {
    await delay(500);
    return {
      user_id          : userId,
      total_co2_kg     : 12.5,
      green_points     : 150,
      rank             : "Người bảo vệ rừng",
      monthly_breakdown: MOCK_ECO_MONTHLY,
    };
  }
  return handleResponse(await fetch(ENDPOINTS.getCarbonCredit(userId), { headers: authHeader(jwtToken) }));
}

// ══════════════════════════════════════════════════════════════════
//  POS API — Write (CHỈ dùng trong MockPosScreen, KHÔNG trên Portal)
// ══════════════════════════════════════════════════════════════════

/**
 * POST /transactions  ← endpoint thật của Backend Lambda
 * Body: { card_id, amount, merchant_id, mcc, description }
 * Trả về: { transaction_id, co2_estimate, new_balance, status, message }
 */
export async function postPosTransaction({ cardId, userId, amount, merchantId, mcc, description }, jwtToken) {
  if (IS_MOCK) {
    await delay(1400);
    if (Math.random() < 0.08) throw new Error("Lambda timeout (simulated). Retry.");
    return {
      transaction_id : `txn_${Date.now()}`,
      co2_estimate   : parseFloat((amount / 10_000_000).toFixed(4)),
      new_balance    : null,
      status         : "SUCCESS",
      message        : "Transaction processed successfully",
    };
  }
  return handleResponse(
    await fetch(ENDPOINTS.postTransaction, {
      method  : "POST",
      headers : {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
        "x-api-key": MERCHANT_API_KEY
      },
      body    : JSON.stringify({
        cardId,
        userId,
        amount,
        currency: "VND",
        merchantId,
        mcc,
        description,
        posDeviceId: "pos_device_01",
      }),
    })
  );
}

// ── Helpers ───────────────────────────────────────────────────────
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ── Mock data (chỉ dùng khi IS_MOCK = true) ───────────────────────
const MOCK_TRANSACTIONS = [
  { transaction_id:"txn_001", timestamp:"2025-07-29T09:14:02Z", type:"debit",  amount:500_000,   merchant_name:"Cửa hàng Xanh Mart",  mcc:"5411", co2_estimate:0.05, description:"Mua sắm tạp hóa" },
  { transaction_id:"txn_002", timestamp:"2025-07-28T15:32:00Z", type:"credit", amount:2_000_000, merchant_name:"Chuyển khoản nội bộ",  mcc:null,   co2_estimate:0.02, description:"Nhận lương tháng 7" },
  { transaction_id:"txn_003", timestamp:"2025-07-28T08:05:11Z", type:"debit",  amount:1_200_000, merchant_name:"Eco Coffee & Co.",      mcc:"5812", co2_estimate:0.12, description:"Thanh toán quán cà phê" },
  { transaction_id:"txn_004", timestamp:"2025-07-27T20:47:00Z", type:"credit", amount:5_000_000, merchant_name:"Nguyen Tuan Anh",       mcc:null,   co2_estimate:0.05, description:"Hoàn tiền dự án" },
  { transaction_id:"txn_005", timestamp:"2025-07-27T11:10:00Z", type:"debit",  amount:300_000,   merchant_name:"GreenBus Transit",      mcc:"4111", co2_estimate:0.01, description:"Vé xe bus tháng" },
  { transaction_id:"txn_006", timestamp:"2025-07-26T18:22:00Z", type:"debit",  amount:450_000,   merchant_name:"Solar Shop VN",         mcc:"5999", co2_estimate:0.03, description:"Phụ kiện năng lượng mặt trời" },
];

export const MOCK_ECO_MONTHLY = [
  { month:"T2", saved:3.2 }, { month:"T3", saved:5.8 },
  { month:"T4", saved:4.1 }, { month:"T5", saved:7.4 },
  { month:"T6", saved:6.0 }, { month:"T7", saved:9.3 },
];