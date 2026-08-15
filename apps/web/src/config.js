// ╔══════════════════════════════════════════════════════════════════╗
// ║  config.js — Toàn bộ cấu hình AWS tập trung ở 1 file duy nhất  ║
// ║  → Chỉ cần sửa file này, mọi service tự động cập nhật           ║
// ╚══════════════════════════════════════════════════════════════════╝

// ─── 1. API Gateway (Serverless Backend) ──────────────────────────
// Ưu tiên env `VITE_API_BASE_URL`. Nếu không có, dev mặc định trỏ local SAM,
// còn build production mới dùng endpoint deployed để không ảnh hưởng production.
const LOCAL_API_BASE_URL = "http://127.0.0.1:3001";
const PROD_API_BASE_URL  = "https://qbrpn8bm0b.execute-api.ap-southeast-2.amazonaws.com/v1";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ?? (import.meta.env.DEV ? LOCAL_API_BASE_URL : PROD_API_BASE_URL);
// Ví dụ: "https://abc123.execute-api.ap-southeast-1.amazonaws.com/v1"

// Endpoint map — đồng bộ với serverless.yml / template.yaml của Backend
export const ENDPOINTS = {
  // ── Customer (read-only) ──────────────────────────────────────
  getProfile     : (userId) => `${API_BASE_URL}/users/${userId}/profile`,
  //  GET /users/{userId}/profile
  //  Response: { userId, fullName, email, balance, currency, createdAt, updatedAt }

  getBalance     : (userId) => `${API_BASE_URL}/users/${userId}/profile`,
  //  GET /users/{userId}/profile
  //  Response: { userId, fullName, email, balance, currency, createdAt, updatedAt, cardId }

  getTransactions: (userId) => `${API_BASE_URL}/users/${userId}/transactions`,
  //  GET /users/{userId}/transactions?limit=20&offset=0
  //  Response: { items: [...], total, limit, offset }

  getCarbonCredit: (userId) => `${API_BASE_URL}/users/${userId}/carbon-credits`,
  //  GET /users/{userId}/carbon-credits
  //  Response: { user_id, total_co2_kg, green_points, rank }

  // ── POS / Merchant (write) — KHÔNG hiển thị trên Customer Portal ──
  postTransaction: `${API_BASE_URL}/transactions`,
  //  POST /transactions
  //  Body: { card_id, amount, merchant_id, mcc, description }
  //  Response: { transaction_id, co2_estimate, new_balance, status }
};

// ─── 2. AWS Cognito ────────────────────────────────────────────────
export const COGNITO_CONFIG = {
  region    : import.meta.env.VITE_COGNITO_REGION     ?? "ap-southeast-2",
  userPoolId: import.meta.env.VITE_COGNITO_POOL_ID    ?? "ap-southeast-2_WjAe0ZZZg",
  clientId  : import.meta.env.VITE_COGNITO_CLIENT_ID  ?? "34tiktnrt20a1m5ullq6i0qlad",
  get endpoint() {
    return `https://cognito-idp.${this.region}.amazonaws.com/`;
  },
};

// ─── 3. Feature flags ──────────────────────────────────────────────
export const IS_MOCK = false;
export const MERCHANT_API_KEY = import.meta.env.VITE_MERCHANT_API_KEY || "";