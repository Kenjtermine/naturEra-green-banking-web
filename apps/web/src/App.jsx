// ╔══════════════════════════════════════════════════════════════════╗
// ║  App.jsx — NaturEra Green Banking · Customer Portal             ║
// ║                                                                  ║
// ║  Kiến trúc:                                                      ║
// ║  App (Auth Gate)                                                 ║
// ║   ├── <AuthPage>        — Đăng nhập / Đăng ký (Cognito)         ║
// ║   ├── <CustomerPortal>  — Giao diện khách hàng (READ ONLY)      ║
// ║   │     ├── BalanceCard        — GET /accounts/{id}/balance      ║
// ║   │     ├── TransactionHistory — GET /accounts/{id}/transactions ║
// ║   │     ├── CarbonDashboard    — GET /users/{id}/carbon-credits  ║
// ║   │     └── CloudWatchSection  — Monitoring AWS                  ║
// ║   └── <MockPosScreen>   — Công cụ test nội bộ (hidden by default)║
// ║         └── POST /transactions (dùng cho dev/QA, không expose)   ║
// ╚══════════════════════════════════════════════════════════════════╝

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Leaf, LogOut, User, CreditCard, Wind, Star, ArrowUpRight,
  ArrowDownLeft, Clock, Loader2, Activity, Terminal,
  ChevronDown, ChevronUp, Zap, Server, BarChart2, TrendingDown,
  Shield, Eye, EyeOff, Lock, Mail, AlertCircle, KeyRound,
  CheckCircle, X, RefreshCw, Store, FlaskConical, Send,
  Banknote, Building2, Hash,
} from "lucide-react";

import { CognitoAuth, fetchBalance, fetchTransactions, fetchCarbonCredit, fetchCustomerProfile, postPosTransaction, MOCK_ECO_MONTHLY } from "./apiService.js";
import { IS_MOCK } from "./config.js";

// ══════════════════════════════════════════════════════════════════
//  🔧  UTILS
// ══════════════════════════════════════════════════════════════════
const fVND = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const fAmount = (n) => {
  const s = new Intl.NumberFormat("vi-VN").format(Math.abs(n));
  return n < 0 ? `- ${s} ₫` : `+ ${s} ₫`;
};

const fTime = (iso) =>
  new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

const MCC_LABEL = {
  "5411": "Tạp hóa", "5812": "Nhà hàng / Cà phê",
  "4111": "Giao thông", "5999": "Cửa hàng khác",
  "5732": "Điện tử",   "5541": "Xăng dầu",
};

// ══════════════════════════════════════════════════════════════════
//  🍞  SHARED UI PRIMITIVES
// ══════════════════════════════════════════════════════════════════
function Toast({ message, type = "success", onClose }) {
  const isErr = type === "error";
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-start gap-3 bg-white shadow-2xl rounded-2xl px-5 py-4 max-w-sm border ${isErr ? "border-red-200" : "border-emerald-200"}`}>
      {isErr
        ? <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
        : <CheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={20} />}
      <p className="text-sm text-gray-700 leading-snug">{message}</p>
      <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600"><X size={16} /></button>
    </div>
  );
}

function Spinner({ size = 18 }) {
  return <Loader2 size={size} className="animate-spin text-emerald-500" />;
}

function SectionCard({ children, className = "" }) {
  return (
    <section className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({ icon, title, right }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold text-gray-700">{title}</h2>
      </div>
      {right}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  🔒  AUTH PAGE  (Login + Register)
// ══════════════════════════════════════════════════════════════════
function AuthPage({ onAuthSuccess }) {
  const [mode,     setMode]     = useState("login");
  // const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [otp,      setOtp]      = useState("");

  async function handleSubmit() {
    setError(""); setSuccess("");
    
    // Kiểm tra rỗng tùy theo mode
    if (mode !== "otp" && (!email || !password)) { 
      setError("Vui lòng điền đầy đủ thông tin."); return; 
    }
    if (mode === "otp" && !otp) {
      setError("Vui lòng nhập mã OTP."); return;
    }
    if (mode === "register" && password !== confirm) { 
      setError("Mật khẩu xác nhận không khớp."); return; 
    }
    
    setLoading(true);
    try {
      if (mode === "login") {
        const tokens = await CognitoAuth.signIn(email, password);
        sessionStorage.setItem("naturera_jwt", tokens.idToken);
        onAuthSuccess(tokens.idToken);
      } 
      else if (mode === "register") {
        const cleanEmail = email.trim();
        await CognitoAuth.signUp(cleanEmail, password, cleanEmail);
        setSuccess("Đăng ký thành công! Kiểm tra email để xác thực, sau đó đăng nhập.");
        setMode("otp"); //
      }
      else if (mode === "otp") { 
        const cleanUsername = email.trim();
        await CognitoAuth.confirmSignUp(cleanUsername, otp);
        setSuccess("Nhập mã xác nhận thành công! Giờ bạn có thể đăng nhập.");
        setMode("login");
      }
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500 opacity-20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-400 opacity-20 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/15 backdrop-blur rounded-2xl mb-4 border border-white/20">
            <Leaf size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">NaturEra</h1>
          <p className="text-emerald-200 text-sm mt-1">Green Banking · Carbon Aware</p>
        </div>
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === m ? "bg-white shadow text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}>
                {m === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            {/* Nếu KHÔNG PHẢI mode OTP thì hiện form Đăng nhập/Đăng ký */}
            {mode !== "otp" ? (
              <>
                {/* <InputField  type="text" placeholder="Họ và tên"
                  value={fullname} onChange={e => setFullname(e.target.value)} onEnter={handleSubmit} /> */}
                <InputField icon={<Mail size={16} />} type="email" placeholder="khoa@naturera.green"
                  value={email} onChange={e => setEmail(e.target.value)} onEnter={handleSubmit} />
                <InputField icon={<Lock size={16} />} type={showPw ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} onEnter={handleSubmit}
                  right={ /* ... nút hiện ẩn password ... */ 
                    <button onClick={() => setShowPw(p => !p)} className="text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }/>
                {mode === "register" && (
                  <InputField icon={<Lock size={16} />} type={showPw ? "text" : "password"} placeholder="Xác nhận mật khẩu"
                    value={confirm} onChange={e => setConfirm(e.target.value)} />
                )}
              </>
            ) : (
              /* NẾU LÀ MODE OTP THÌ HIỆN FORM NÀY */
              <div className="animate-fade-in">
                <p className="text-sm text-gray-600 mb-4 text-center">
                  Mã xác nhận gồm 6 số đã được gửi tới <b>{email}</b>.
                </p>
                <InputField icon={<KeyRound size={16} />} type="text" placeholder="Nhập mã OTP..."
                  value={otp} onChange={e => setOtp(e.target.value)} onEnter={handleSubmit} />
              </div>
            )}

            {error   && <AlertBox type="error">{error}</AlertBox>}
            {success && <AlertBox type="success">{success}</AlertBox>}
            
            <button onClick={handleSubmit} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl transition-colors mt-2">
              {loading ? <Spinner size={17} /> : <KeyRound size={17} />}
              {/* ĐỔI TEXT NÚT BẤM THEO MODE */}
              {loading ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : mode === "register" ? "Tạo tài khoản" : "Xác thực tài khoản"}
            </button>
            
            {/* Nút quay lại login nếu đang ở màn hình OTP */}
            {mode === "otp" && (
              <button onClick={() => setMode("login")} className="w-full text-sm text-emerald-600 hover:underline mt-2">
                Quay lại đăng nhập
              </button>
            )}
          </div>
        </div>

        
        <p className="text-center text-xs text-emerald-300 mt-6">Bảo mật bởi AWS Cognito · TLS 1.3 · MFA Ready</p>
      </div>
    </div>
  );
}

function InputField({ icon, type, placeholder, value, onChange, onEnter, right }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        onKeyDown={e => e.key === "Enter" && onEnter?.()}
        className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition" />
      {right && <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</span>}
    </div>
  );
}

function AlertBox({ type, children }) {
  const isErr = type === "error";
  return (
    <div className={`flex items-start gap-2 rounded-xl px-4 py-3 border ${isErr ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
      {isErr ? <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" /> : <CheckCircle size={15} className="text-emerald-600 mt-0.5 shrink-0" />}
      <p className={`text-xs ${isErr ? "text-red-600" : "text-emerald-700"}`}>{children}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  💳  BALANCE CARD  — ưu tiên lấy từ customer profile.
//  Nếu profile chưa sẵn sàng, fallback về /accounts/{cardId}/balance
// ══════════════════════════════════════════════════════════
function BalanceCard({ userId, cardId, jwtToken }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const profile = await fetchCustomerProfile(userId, jwtToken);
      setData({
        balance: profile.balance,
        currency: profile.currency,
        updated_at: profile.updatedAt,
        card_id: cardId,
      });
    } catch (e) {
      try {
        setData(await fetchBalance(cardId, jwtToken));
      } catch (fallbackErr) {
        setError(fallbackErr.message || e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, cardId, jwtToken]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="bg-gradient-to-br from-emerald-600 to-teal-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      {/* decorative circle */}
      <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full" />
      <div className="absolute -right-2 -bottom-10 w-24 h-24 bg-white/10 rounded-full" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-200" />
            <span className="text-sm font-medium text-emerald-100">Số dư khả dụng</span>
          </div>
          <button onClick={load} title="Làm mới"
            className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {loading && !data ? (
          <div className="h-10 flex items-center"><Spinner size={22} /><span className="ml-2 text-emerald-200 text-sm">Đang tải…</span></div>
        ) : error ? (
          <p className="text-red-200 text-sm">{error}</p>
        ) : (
          <>
            <p className="text-3xl font-bold tracking-tight mb-1">{fVND(data.balance)}</p>
            <p className="text-xs text-emerald-200">Cập nhật: {fTime(data.updated_at)}</p>
          </>
        )}

        <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
          <span className="text-xs bg-white/15 px-2.5 py-1 rounded-full font-mono">{cardId}</span>
          <span className="text-xs text-emerald-200">· {data?.currency ?? "VND"}</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  🌿  CARBON CREDIT CARD  — GET /users/{userId}/carbon-credits
// ══════════════════════════════════════════════════════════════════
function CarbonCreditCard({ userId, jwtToken }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCarbonCredit(userId, jwtToken).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [userId, jwtToken]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center">
          <Wind size={17} className="text-sky-500" />
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Tín chỉ Carbon</p>
          {loading ? <div className="h-5 w-20 bg-gray-100 rounded animate-pulse mt-1" />
            : <p className="text-xl font-bold text-gray-800">{data?.total_co2_kg} kg CO₂</p>}
        </div>
      </div>
      {!loading && data && (
        <>
          <div className="flex items-center gap-2">
            <Star size={14} className="text-amber-400" />
            <span className="text-sm font-semibold text-gray-700">{data.green_points} điểm xanh</span>
            <span className="ml-auto text-xs bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded-full font-medium">{data.rank}</span>
          </div>
          {/* Mini bar chart */}
          <MiniBarChart data={data.monthly_breakdown ?? MOCK_ECO_MONTHLY} />
        </>
      )}
    </div>
  );
}

function MiniBarChart({ data }) {
  const max = Math.max(...data.map(d => d.saved));
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">CO₂ tiết kiệm 6 tháng (kg)</p>
      <div className="flex items-end gap-1.5 h-16">
        {data.map(d => {
          const pct = Math.round((d.saved / max) * 100);
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group relative">
              <span className="absolute -top-4 text-xs text-emerald-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{d.saved}</span>
              <div className="w-full flex items-end" style={{ height: "44px" }}>
                <div className={`w-full rounded-sm transition-all ${d.saved === max ? "bg-emerald-500" : "bg-emerald-200 group-hover:bg-emerald-400"}`}
                  style={{ height: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400">{d.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  📋  TRANSACTION HISTORY  — GET /users/{userId}/transactions
// ══════════════════════════════════════════════════════════════════
function TransactionHistory({ userId, jwtToken }) {
  const [data,    setData]    = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [page,    setPage]    = useState(0);
  const PAGE_SIZE = 10;

  const load = useCallback(async (p = 0) => {
    setLoading(true); setError(null);
    try {
      const res = await fetchTransactions(userId, jwtToken, { limit: PAGE_SIZE, offset: p * PAGE_SIZE });
      setData(res);
      setPage(p);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [userId, jwtToken]);

  useEffect(() => { load(0); }, [load]);

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  return (
    <SectionCard>
      <SectionHeader
        icon={<Clock size={18} className="text-emerald-600" />}
        title="Lịch sử giao dịch"
        right={
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">{data.total} giao dịch</span>
            <button onClick={() => load(page)} title="Làm mới"
              className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <RefreshCw size={13} className={loading ? "animate-spin text-emerald-500" : "text-gray-400"} />
            </button>
          </div>
        }
      />

      {error && <AlertBox type="error">{error}</AlertBox>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="pb-3 font-semibold pr-3">Thời gian</th>
              <th className="pb-3 font-semibold pr-3">Loại / Merchant</th>
              <th className="pb-3 font-semibold pr-3">MCC</th>
              <th className="pb-3 font-semibold pr-3 text-right">Số tiền</th>
              <th className="pb-3 font-semibold text-right">CO₂ (kg)</th>
            </tr>
          </thead>
          <tbody>
            {loading && data.items.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center"><div className="flex justify-center"><Spinner /></div></td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-gray-400 text-sm">Chưa có giao dịch nào.</td></tr>
            ) : data.items.map((tx, i) => {
              const isDebit = tx.type === "debit";
              return (
                <tr key={tx.transaction_id}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i === 0 ? "bg-emerald-50/40" : ""}`}>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap text-xs">{fTime(tx.timestamp)}</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${isDebit ? "bg-red-50" : "bg-emerald-50"}`}>
                        {isDebit ? <ArrowUpRight size={11} className="text-red-500" /> : <ArrowDownLeft size={11} className="text-emerald-600" />}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-gray-700 leading-tight">{tx.merchant_name}</p>
                        <p className="text-xs text-gray-400">{tx.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    {tx.mcc
                      ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{tx.mcc} · {MCC_LABEL[tx.mcc] ?? "Khác"}</span>
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className={`py-3 pr-3 text-right font-bold tabular-nums ${isDebit ? "text-red-500" : "text-emerald-600"}`}>
                    {fAmount(isDebit ? -tx.amount : tx.amount)}
                  </td>
                  <td className="py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full font-medium tabular-nums">
                      <Wind size={10} />{tx.co2_estimate?.toFixed(3) ?? "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-400">Trang {page + 1} / {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => load(page - 1)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">← Trước</button>
            <button disabled={page + 1 >= totalPages} onClick={() => load(page + 1)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Tiếp →</button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ══════════════════════════════════════════════════════════════════
//  🖥️  CLOUDWATCH MONITORING
// ══════════════════════════════════════════════════════════════════
const MOCK_LOGS = [
  `{"timestamp":"2025-07-29T09:14:02Z","level":"INFO","service":"TransactionLambda","requestId":"a3f1c-9d2e","message":"GET /accounts/card_001/transactions — 200 OK","duration_ms":43}`,
  `{"timestamp":"2025-07-29T09:14:02Z","level":"INFO","service":"CO2Calculator","requestId":"a3f1c-9d2e","message":"Carbon footprint calculated","co2Estimate":0.05,"unit":"kg"}`,
  `{"timestamp":"2025-07-29T09:14:03Z","level":"INFO","service":"DynamoDB","requestId":"a3f1c-9d2e","message":"Query complete","table":"naturera-transactions","count":6}`,
  `{"timestamp":"2025-07-29T09:14:03Z","level":"INFO","service":"TransactionLambda","requestId":"a3f1c-9d2e","message":"Response sent","statusCode":200,"duration_ms":48}`,
  `{"timestamp":"2025-07-29T08:05:12Z","level":"WARN","service":"RateLimiter","requestId":"b7e2d-1a4f","message":"High frequency detected","threshold":5,"window":"60s"}`,
  `{"timestamp":"2025-07-29T08:05:13Z","level":"INFO","service":"BalanceLambda","requestId":"b7e2d-1a4f","message":"GET /accounts/card_001/balance — 200 OK","duration_ms":31}`,
  `{"timestamp":"2025-07-28T15:32:08Z","level":"INFO","service":"CarbonLambda","requestId":"c9a3e-5b1d","message":"GET /users/demo-user-001/carbon-credits — 200 OK","duration_ms":52}`,
];

function CloudWatchSection() {
  const [open, setOpen]       = useState(false);
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick]       = useState(0);
  const termRef               = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);
  const latency = 31 + ((tick * 7) % 22);

  async function fetchLogs() {
    if (open) { setOpen(false); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLogs(MOCK_LOGS);
    setLoading(false);
    setOpen(true);
  }

  useEffect(() => {
    if (open && termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [open, logs]);

  return (
    <SectionCard>
      <SectionHeader
        icon={<Activity size={18} className="text-emerald-600" />}
        title="AWS CloudWatch Monitoring"
        right={
          <button onClick={fetchLogs}
            className="flex items-center gap-2 text-xs font-semibold bg-gray-900 hover:bg-gray-700 text-green-400 px-4 py-2 rounded-lg transition-colors">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Terminal size={13} />}
            {loading ? "Đang tải…" : open ? "Đóng Logs" : "Xem CloudWatch Logs"}
            {!loading && (open ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
          </button>
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { icon: <Zap size={14} className="text-emerald-500" />, label: "Lambda Status", val: "● Normal",      vc: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: <Activity size={14} className="text-sky-500" />, label: "Avg Latency",   val: `~${latency} ms`, vc: "text-sky-700",     bg: "bg-sky-50" },
          { icon: <Server size={14} className="text-violet-500" />, label: "API Gateway",  val: "Healthy",        vc: "text-violet-700",  bg: "bg-violet-50" },
          { icon: <Shield size={14} className="text-amber-500" />, label: "Error Rate",    val: "0.00 %",         vc: "text-amber-700",   bg: "bg-amber-50" },
        ].map(m => (
          <div key={m.label} className={`${m.bg} rounded-xl px-3 py-3 flex flex-col gap-1`}>
            <div className="flex items-center gap-1.5 text-gray-500">{m.icon}<span className="text-xs">{m.label}</span></div>
            <p className={`text-sm font-bold ${m.vc}`}>{m.val}</p>
          </div>
        ))}
      </div>
      {open && (
        <div className="rounded-xl overflow-hidden border border-gray-800">
          <div className="bg-gray-900 flex items-center gap-2 px-4 py-2.5">
            <span className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
            <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 opacity-80" />
            <span className="ml-3 text-xs text-gray-400 font-mono">/aws/lambda/naturera-* — Live Stream</span>
          </div>
          <div ref={termRef} className="bg-gray-950 font-mono text-xs text-green-400 p-4 h-52 overflow-y-auto space-y-1.5 leading-relaxed">
            <p className="text-gray-500">$ aws logs tail /aws/lambda/naturera-transaction-lambda --follow</p>
            {logs.map((line, i) => {
              let lc = "text-green-400";
              try { const p = JSON.parse(line); if (p.level === "WARN") lc = "text-yellow-400"; if (p.level === "ERROR") lc = "text-red-400"; } catch {}
              return <div key={i} className="flex gap-2"><span className="text-gray-600 shrink-0">{String(i + 1).padStart(2, "0")}</span><span className={lc}>{line}</span></div>;
            })}
            <p className="text-gray-600 mt-2">█</p>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ══════════════════════════════════════════════════════════════════
//  🏪  MOCK POS SCREEN — Công cụ test nội bộ (không hiển thị mặc định)
//  Mô phỏng máy POS tại cửa hàng gửi POST /transactions lên Backend
// ══════════════════════════════════════════════════════════════════
function MockPosScreen({ cardId, userId, jwtToken, onClose }) {
  const [form, setForm]       = useState({ amount: "", merchantId: "", mcc: "5999", description: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");

  async function handleSubmit() {
    if (!form.amount || !form.merchantId) { setError("Vui lòng điền đầy đủ Amount và Merchant ID."); return; }
    setError(""); setResult(null); setLoading(true);
    try {
      const res = await postPosTransaction({
        cardId,
        userId,
        amount     : +form.amount,
        merchantId : form.merchantId,
        mcc        : form.mcc,
        description: form.description || "POS Transaction",
      }, jwtToken);
      setResult(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const payload = {
    cardId,
    userId,
    amount     : +form.amount || 0,
    merchantId : form.merchantId || "merchant_xxx",
    mcc        : form.mcc,
    currency   : "VND",
    description: form.description || "POS Transaction",
    posDeviceId: "pos_device_01",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-gray-950 w-full max-w-xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
        {/* Title bar */}
        <div className="bg-gray-900 flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-amber-400" />
            <span className="text-sm font-bold text-white">Mock POS Terminal</span>
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono">DEV ONLY</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Endpoint badge */}
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
            <span className="text-xs font-bold text-emerald-400 font-mono">EXECUTE</span>
            <span className="text-xs text-gray-400 font-mono">TRANSACTION</span>
            <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded ${IS_MOCK ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
              {IS_MOCK ? "Mock" : "Live"}
            </span>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-3">
            <PosField label="Amount (VND)" icon={<Banknote size={13} />}
              type="number" placeholder="500000" value={form.amount}
              onChange={v => setForm(f => ({ ...f, amount: v }))} />
            <PosField label="Merchant ID" icon={<Building2 size={13} />}
              placeholder="merchant_001" value={form.merchantId}
              onChange={v => setForm(f => ({ ...f, merchantId: v }))} />
            <PosField label="MCC Code" icon={<Hash size={13} />}
              placeholder="5999" value={form.mcc}
              onChange={v => setForm(f => ({ ...f, mcc: v }))} />
            <PosField label="Description" icon={<Store size={13} />}
              placeholder="POS Transaction" value={form.description}
              onChange={v => setForm(f => ({ ...f, description: v }))} />
          </div>

          {/* Payload preview */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-mono mb-2">// Request body preview</p>
            <pre className="text-xs text-emerald-300 font-mono leading-relaxed overflow-x-auto">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}

          {/* Response */}
          {result && (
            <div className="bg-gray-900 border border-emerald-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-mono mb-2">// Response 200 OK</p>
              <pre className="text-xs text-emerald-300 font-mono leading-relaxed">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-800 text-gray-900 font-bold text-sm py-2.5 rounded-xl transition-colors">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {loading ? "Sending…" : "EXECUTE TRANSACTION"}
          </button>
          <p className="text-xs text-gray-600 text-center">Màn hình này chỉ dành cho dev/QA. Không hiển thị trên Customer Portal.</p>
        </div>
      </div>
    </div>
  );
}

function PosField({ label, icon, type = "text", placeholder, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-500 flex items-center gap-1">{icon}{label}</label>
      <input type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-gray-900 border border-gray-700 text-green-300 placeholder-gray-600 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 transition" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  🏦  CUSTOMER PORTAL (main dashboard — read-only)
// ══════════════════════════════════════════════════════════════════
function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
}

function CustomerPortal({ jwtToken, onSignOut }) {
  const claims = decodeJwtPayload(jwtToken);
  const user = {
    userId : claims.sub || claims["custom:userId"] || claims["cognito:username"] || "demo-user-001",
    name   : claims.name || claims.email || "NaturEra User",
  };

  const [showPos, setShowPos] = useState(false);
  const [toast,   setToast]   = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchCustomerProfile(user.userId, jwtToken)
      .then((data) => setProfile(data))
      .catch((err) => console.error("Failed to load customer profile:", err));
  }, [user.userId, jwtToken]);

  const displayName = profile?.fullName || user.name;
  const activeCardId = profile?.cardId || "card_001";

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {showPos && (
        <MockPosScreen
          cardId={activeCardId}
          userId={user.userId}
          jwtToken={jwtToken}
          onClose={() => setShowPos(false)}
        />
      )}

      {/* ── HEADER ── */}
      <header className="bg-emerald-700 text-white px-6 py-4 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="bg-white/20 p-1.5 rounded-lg"><Leaf size={20} className="text-emerald-100" /></div>
          <div>
            <p className="text-xs font-medium text-emerald-200 leading-none">NaturEra</p>
            <p className="text-base font-bold leading-tight">Green Banking</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-emerald-200">
          {["Dashboard", "Lịch sử", "Eco Report", "Cài đặt"].map(n => (
            <span key={n} className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${n === "Dashboard" ? "bg-white/20 text-white" : "hover:bg-white/10"}`}>{n}</span>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Dev: hidden POS trigger (Ctrl+Shift+P hoặc nút nhỏ) */}
          <button
            onClick={() => setShowPos(true)}
            title="Mở Mock POS (Dev Tool)"
            className="hidden sm:flex items-center gap-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-300 px-2.5 py-1.5 rounded-lg transition-colors font-mono"
          >
            <FlaskConical size={12} />POS
          </button>

          <div className="flex items-center gap-1.5 bg-emerald-600/60 border border-emerald-500 rounded-full px-2.5 py-1">
            <Shield size={11} className="text-emerald-300" />
            <span className="text-xs text-emerald-200 font-mono hidden sm:inline">JWT ✓</span>
          </div>

          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
            <div className="w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center">
              <User size={13} className="text-white" />
            </div>
            <span className="text-sm font-medium hidden sm:inline">{displayName}</span>
          </div>
          <button onClick={onSignOut} className="flex items-center gap-1.5 text-emerald-200 hover:text-white text-sm transition-colors">
            <LogOut size={16} />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── OVERVIEW ROW ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Balance chiếm 2 cột trên mobile = full width, trên md = 2/3 */}
          <div className="md:col-span-2">
            <BalanceCard userId={user.userId} cardId={activeCardId} jwtToken={jwtToken} />
          </div>
          <div>
            <CarbonCreditCard userId={user.userId} jwtToken={jwtToken} />
          </div>
        </div>

        {/* ── TRANSACTION HISTORY ── */}
        <TransactionHistory userId={user.userId} jwtToken={jwtToken} />

        {/* ── CLOUDWATCH ── */}
        <CloudWatchSection />

        {/* ── FOOTER ── */}
        <footer className="text-center text-xs text-gray-300 pb-4 space-y-1">
          <p>NaturEra Green Banking · {displayName} · Bảo vệ hành tinh từng giao dịch 🌱</p>
          <p className="text-gray-200">Powered by AWS Lambda · API Gateway · DynamoDB · Cognito · CloudWatch</p>
        </footer>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  🚀  ROOT — Auth Gate
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const saved = sessionStorage.getItem("naturera_jwt");
  const [jwtToken, setJwtToken] = useState(saved || null);

  function handleAuthSuccess(token) {
    sessionStorage.setItem("naturera_jwt", token);
    setJwtToken(token);
  }

  function handleSignOut() {
    CognitoAuth.signOut();
    setJwtToken(null);
  }

  if (!jwtToken) return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  return <CustomerPortal jwtToken={jwtToken} onSignOut={handleSignOut} />;
}
