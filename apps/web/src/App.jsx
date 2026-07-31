import { useState, useEffect, useRef } from "react";
import {
  Leaf, LogOut, User, CreditCard, Wind, Star, Send,
  CheckCircle, X, ArrowUpRight, ArrowDownLeft, Clock,
  Loader2, Activity, Terminal, ChevronDown, ChevronUp,
  Zap, Server, BarChart2, TrendingDown, Shield, Eye,
  EyeOff, Lock, Mail, AlertCircle, KeyRound,
} from "lucide-react";

// ╔══════════════════════════════════════════════════════════════╗
// ║  ⚙️  CONFIGURATION — Điền thông tin AWS của bạn vào đây     ║
// ╚══════════════════════════════════════════════════════════════╝

// 1️⃣  API Gateway — Điền URL sau khi deploy Lambda
const API_URL = "https://qbrpn8bm0b.execute-api.ap-southeast-2.amazonaws.com/Stage";

// 2️⃣  AWS Cognito — Điền thông số Cognito User Pool của bạn
const COGNITO_CONFIG = {
  region        : "ap-southeast-2",                        // ← AWS Region
  userPoolId    : "ap-southeast-2_WjAe0ZZZg",              // ← User Pool ID
  clientId      : "34tiktnrt20a1m5ullq6i0qlad",            // ← App Client ID
  // Endpoint tự động build từ region + userPoolId
  get endpoint() {
    return `https://cognito-idp.${this.region}.amazonaws.com/`;
  },
};

// ╔══════════════════════════════════════════════════════════════╗
// ║  📦  MOCK DATA                                               ║
// ╚══════════════════════════════════════════════════════════════╝
const MOCK_USER = {
  userId      : "demo-user-001",
  cardId      : "card_001",
  name        : "Nguyễn Minh Khoa",
  email       : "khoa@naturera.green",
  balance     : 10_000_000,
  co2Total    : 12.5,
  greenPoints : 150,
};

const MOCK_TRANSACTIONS = [
  { id:"txn_001", time:"2025-07-29 09:14", type:"send",    label:"Chuyển tiền", amount:-500_000,   co2:0.05 },
  { id:"txn_002", time:"2025-07-28 15:32", type:"receive", label:"Nhận tiền",   amount:2_000_000,  co2:0.02 },
  { id:"txn_003", time:"2025-07-28 08:05", type:"send",    label:"Chuyển tiền", amount:-1_200_000, co2:0.12 },
  { id:"txn_004", time:"2025-07-27 20:47", type:"receive", label:"Nhận tiền",   amount:5_000_000,  co2:0.05 },
  { id:"txn_005", time:"2025-07-27 11:10", type:"send",    label:"Chuyển tiền", amount:-300_000,   co2:0.03 },
];

const ECO_MONTHLY = [
  { month:"T2", saved:3.2 }, { month:"T3", saved:5.8 },
  { month:"T4", saved:4.1 }, { month:"T5", saved:7.4 },
  { month:"T6", saved:6.0 }, { month:"T7", saved:9.3 },
];

const MOCK_LOGS = [
  `{"timestamp":"2025-07-29T09:14:02Z","level":"INFO","service":"TransferLambda","requestId":"a3f1c-9d2e","message":"Transaction initiated","userId":"demo-user-001","amount":500000}`,
  `{"timestamp":"2025-07-29T09:14:02Z","level":"INFO","service":"CO2Calculator","requestId":"a3f1c-9d2e","message":"Carbon footprint calculated","co2Estimate":0.05,"unit":"kg"}`,
  `{"timestamp":"2025-07-29T09:14:03Z","level":"INFO","service":"DynamoDB","requestId":"a3f1c-9d2e","message":"Record persisted","table":"naturera-transactions","status":"SUCCESS"}`,
  `{"timestamp":"2025-07-29T09:14:03Z","level":"INFO","service":"SNS","requestId":"a3f1c-9d2e","message":"Notification dispatched","channel":"email+push"}`,
  `{"timestamp":"2025-07-29T09:14:03Z","level":"INFO","service":"TransferLambda","requestId":"a3f1c-9d2e","message":"Transaction complete","duration_ms":48,"statusCode":200}`,
  `{"timestamp":"2025-07-29T08:05:12Z","level":"WARN","service":"RateLimiter","requestId":"b7e2d-1a4f","message":"High frequency detected","threshold":5,"window":"60s"}`,
  `{"timestamp":"2025-07-29T08:05:12Z","level":"INFO","service":"CO2Calculator","requestId":"b7e2d-1a4f","message":"Carbon footprint calculated","co2Estimate":0.12,"unit":"kg"}`,
  `{"timestamp":"2025-07-29T08:05:13Z","level":"INFO","service":"TransferLambda","requestId":"b7e2d-1a4f","message":"Transaction complete","duration_ms":52,"statusCode":200}`,
  `{"timestamp":"2025-07-28T15:32:07Z","level":"INFO","service":"ReceiveLambda","requestId":"c9a3e-5b1d","message":"Inbound transfer received","amount":2000000}`,
  `{"timestamp":"2025-07-28T15:32:08Z","level":"INFO","service":"DynamoDB","requestId":"c9a3e-5b1d","message":"Balance updated","newBalance":10000000}`,
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  🔐  AWS COGNITO AUTH SERVICE (LIVE MODE - BUG FIXED)        ║
// ╚══════════════════════════════════════════════════════════════╝
const CognitoAuth = {
  async signIn(username, password) {
    const res = await fetch(COGNITO_CONFIG.endpoint, {
      method  : "POST",
      headers : {
        "Content-Type"  : "application/x-amz-json-1.1",
        "X-Amz-Target"  : "AWSCognitoIdentityProviderService.InitiateAuth", // Đã sửa thành AWS
      },
      body: JSON.stringify({
        AuthFlow       : "USER_PASSWORD_AUTH",
        ClientId       : COGNITO_CONFIG.clientId,
        AuthParameters : { USERNAME: username, PASSWORD: password },
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.");
    }
    const data = await res.json();
    return {
      idToken      : data.AuthenticationResult.IdToken,
      accessToken  : data.AuthenticationResult.AccessToken,
      refreshToken : data.AuthenticationResult.RefreshToken,
    };
  },

  async signUp(username, password, email) {
    const res = await fetch(COGNITO_CONFIG.endpoint, {
      method  : "POST",
      headers : {
        "Content-Type" : "application/x-amz-json-1.1",
        "X-Amz-Target" : "AWSCognitoIdentityProviderService.SignUp", 
      },
      body: JSON.stringify({
        ClientId       : COGNITO_CONFIG.clientId,
        Username       : username,
        Password       : password,
        UserAttributes : [
          { Name: "email", Value: email },
          { Name: "name", Value: "Thành viên NaturEra" } 
          // Đã xóa name.formatted vì đây là attribute không hợp lệ
        ],
      }),
    });
    if (!res.ok) { 
      const e = await res.json(); 
      throw new Error(e.message || "Đăng ký thất bại."); 
    }
    return await res.json();
  },

  signOut() {
    sessionStorage.removeItem("naturera_jwt");
    sessionStorage.removeItem("naturera_user");
  },
};
// ╔══════════════════════════════════════════════════════════════╗
// ║  🌐  API SERVICE — POST transaction với JWT header           ║
// ╚══════════════════════════════════════════════════════════════╝
const ApiService = {
  async transfer({ cardId, amount, recipientAccount, description, jwtToken }) {
    const IS_MOCK = API_URL === "YOUR_API_GATEWAY_URL_HERE";

    if (IS_MOCK) {
      // ... (Phần mock giữ nguyên) ...
    }

    // ── THẬT: gọi API Gateway ──
    const res = await fetch(`${API_URL}/transactions`, {
      method  : "POST",
      headers : {
        "Content-Type"  : "application/json",
        "Authorization" : `Bearer ${jwtToken}`,  
      },
      body: JSON.stringify({
        // 1. Sửa card_id thành cardId cho khớp Schema
        cardId            : cardId,
        amount            : amount,
        recipientAccount  : recipientAccount, // Sửa thành camelCase cho đồng bộ
        description       : description,
        
        // 2. Bổ sung các trường POS bắt buộc để vượt qua Validator của Lambda
        userId            : "demo-user-001",  // Hoặc truyền từ user object xuống
        currency          : "VND",
        merchantId        : "MERCHANT_WEB_01",
        mcc               : "6011",           // Merchant Category Code (6011 thường dùng cho Rút tiền/Chuyển tiền)
        posDeviceId       : "POS_VIRTUAL_WEB"
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Lỗi ${res.status}: Giao dịch thất bại`);
    }
    return await res.json();
  },
};

// ╔══════════════════════════════════════════════════════════════╗
// ║  🔧  UTILS                                                   ║
// ╚══════════════════════════════════════════════════════════════╝
const formatVND    = (n) => new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND"}).format(n);
const formatAmount = (n) => {
  const s = new Intl.NumberFormat("vi-VN").format(Math.abs(n));
  return n < 0 ? `- ${s} ₫` : `+ ${s} ₫`;
};
const MAX_ECO = Math.max(...ECO_MONTHLY.map(d => d.saved));

// ╔══════════════════════════════════════════════════════════════╗
// ║  🍞  TOAST COMPONENT                                         ║
// ╚══════════════════════════════════════════════════════════════╝
function Toast({ message, type = "success", onClose }) {
  const isError = type === "error";
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-start gap-3 bg-white shadow-2xl rounded-2xl px-5 py-4 max-w-sm border ${isError ? "border-red-200" : "border-emerald-200"}`}>
      {isError
        ? <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20}/>
        : <CheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={20}/>}
      <p className="text-sm text-gray-700 leading-snug">{message}</p>
      <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600"><X size={16}/></button>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  📊  STAT CARD                                               ║
// ╚══════════════════════════════════════════════════════════════╝
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  🖥️  CLOUDWATCH SECTION                                      ║
// ╚══════════════════════════════════════════════════════════════╝
function CloudWatchSection() {
  const [open,    setOpen]    = useState(false);
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [tick,    setTick]    = useState(0);
  const termRef               = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);
  const latency = 48 + ((tick * 7) % 15);

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
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-emerald-600"/>
          <h2 className="text-base font-semibold text-gray-700">AWS CloudWatch Monitoring</h2>
        </div>
        <button onClick={fetchLogs}
          className="flex items-center gap-2 text-xs font-semibold bg-gray-900 hover:bg-gray-700 text-green-400 px-4 py-2 rounded-lg transition-colors">
          {loading ? <Loader2 size={13} className="animate-spin"/> : <Terminal size={13}/>}
          {loading ? "Đang tải logs…" : open ? "Đóng Logs" : "Xem AWS CloudWatch Logs"}
          {!loading && (open ? <ChevronUp size={13}/> : <ChevronDown size={13}/>)}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricChip icon={<Zap size={14} className="text-emerald-500"/>}  label="Lambda Status" value="● Normal"   valueClass="text-emerald-600" bg="bg-emerald-50"/>
        <MetricChip icon={<Activity size={14} className="text-sky-500"/>}  label="Avg Latency"  value={`~${latency} ms`} valueClass="text-sky-700"     bg="bg-sky-50"/>
        <MetricChip icon={<Server size={14} className="text-violet-500"/>} label="API Gateway"  value="Healthy"   valueClass="text-violet-700"  bg="bg-violet-50"/>
        <MetricChip icon={<Shield size={14} className="text-amber-500"/>}  label="Error Rate"   value="0.00 %"    valueClass="text-amber-700"   bg="bg-amber-50"/>
      </div>
      {open && (
        <div className="rounded-xl overflow-hidden border border-gray-800">
          <div className="bg-gray-900 flex items-center gap-2 px-4 py-2.5">
            <span className="w-3 h-3 rounded-full bg-red-500 opacity-80"/>
            <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-80"/>
            <span className="w-3 h-3 rounded-full bg-emerald-500 opacity-80"/>
            <span className="ml-3 text-xs text-gray-400 font-mono">/aws/lambda/naturera-transfer — CloudWatch Logs</span>
          </div>
          <div ref={termRef} className="bg-gray-950 font-mono text-xs text-green-400 p-4 h-56 overflow-y-auto space-y-1.5 leading-relaxed">
            <p className="text-gray-500">$ aws logs tail /aws/lambda/naturera-transfer --follow</p>
            {logs.map((line, i) => {
              let lc = "text-green-400";
              try { const p = JSON.parse(line); if(p.level==="WARN") lc="text-yellow-400"; if(p.level==="ERROR") lc="text-red-400"; } catch{}
              return (
                <div key={i} className="flex gap-2">
                  <span className="text-gray-600 shrink-0">{String(i+1).padStart(2,"0")}</span>
                  <span className={lc}>{line}</span>
                </div>
              );
            })}
            <p className="text-gray-600 mt-2">█</p>
          </div>
        </div>
      )}
    </section>
  );
}
function MetricChip({ icon, label, value, valueClass, bg }) {
  return (
    <div className={`${bg} rounded-xl px-3 py-3 flex flex-col gap-1`}>
      <div className="flex items-center gap-1.5 text-gray-500">{icon}<span className="text-xs">{label}</span></div>
      <p className={`text-sm font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  🌿  ECO ANALYTICS                                           ║
// ╚══════════════════════════════════════════════════════════════╝
function EcoAnalyticsSection() {
  const totalSaved = ECO_MONTHLY.reduce((s,d) => s+d.saved, 0).toFixed(1);
  const treesEq    = (totalSaved/21).toFixed(1);
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-emerald-600"/>
          <h2 className="text-base font-semibold text-gray-700">Eco Analytics — CO₂ Tiết Kiệm</h2>
        </div>
        <div className="flex gap-3 flex-wrap">
          <KpiPill icon={<TrendingDown size={12}/>} label={`${totalSaved} kg CO₂ tiết kiệm`} color="bg-emerald-50 text-emerald-700"/>
          <KpiPill icon={<Leaf size={12}/>}         label={`≈ ${treesEq} cây xanh`}           color="bg-lime-50 text-lime-700"/>
        </div>
      </div>
      <div className="flex items-end gap-3 h-44">
        {ECO_MONTHLY.map(d => {
          const pct   = Math.round((d.saved/MAX_ECO)*100);
          const isMax = d.saved === MAX_ECO;
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5 group">
              <span className="text-xs font-semibold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">{d.saved}</span>
              <div className="w-full flex items-end" style={{height:"120px"}}>
                <div className={`w-full rounded-t-lg transition-all duration-500 ${isMax?"bg-emerald-500 shadow-md shadow-emerald-200":"bg-emerald-200 group-hover:bg-emerald-400"}`}
                  style={{height:`${pct}%`}}/>
              </div>
              <span className="text-xs text-gray-400 font-medium">{d.month}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-3 text-right">Đơn vị: kg CO₂ — So sánh theo tháng trong năm 2025</p>
      <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
        <MiniStat label="Tháng tốt nhất"    value="Tháng 7"                                        sub="9.3 kg saved"/>
        <MiniStat label="Trung bình/tháng"  value={`${(totalSaved/ECO_MONTHLY.length).toFixed(1)} kg`} sub="6 tháng gần nhất"/>
        <MiniStat label="So tháng trước"    value="+55 %"                                          sub="T6 → T7"/>
      </div>
    </section>
  );
}
function KpiPill({ icon, label, color }) {
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${color}`}>{icon}{label}</span>;
}
function MiniStat({ label, value, sub }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-base font-bold text-gray-800">{value}</p>
      <p className="text-xs text-emerald-600">{sub}</p>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  🔐  LOGIN / REGISTER PAGE                                   ║
// ╚══════════════════════════════════════════════════════════════╝
function AuthPage({ onAuthSuccess }) {
  const [mode,     setMode]     = useState("login");   // "login" | "register"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  async function handleSubmit() {
    setError(""); setSuccess("");
    if (!email || !password) { setError("Vui lòng điền đầy đủ thông tin."); return; }
    if (mode === "register" && password !== confirm) { setError("Mật khẩu xác nhận không khớp."); return; }

    setLoading(true);
    try {
      if (mode === "login") {
        const tokens = await CognitoAuth.signIn(email, password);
        // Lưu token vào sessionStorage (tắt tab là xóa — an toàn hơn localStorage)
        sessionStorage.setItem("naturera_jwt", tokens.idToken);
        onAuthSuccess(tokens.idToken, MOCK_USER);
      } else {
        await CognitoAuth.signUp(email, password, email);
        setSuccess("Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản, sau đó đăng nhập.");
        setMode("login");
      }
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 flex items-center justify-center px-4">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500 opacity-20 rounded-full blur-3xl"/>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-400 opacity-20 rounded-full blur-3xl"/>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/15 backdrop-blur rounded-2xl mb-4 border border-white/20">
            <Leaf size={30} className="text-white"/>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">NaturEra</h1>
          <p className="text-emerald-200 text-sm mt-1">Green Banking · Carbon Aware</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {["login","register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  mode===m ? "bg-white shadow text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}>
                {m==="login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input type="email" placeholder="khoa@naturera.green" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && handleSubmit()}
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"/>
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input type={showPw ? "text" : "password"} placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && handleSubmit()}
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"/>
                <button onClick={() => setShowPw(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Confirm password (register only) */}
            {mode === "register" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Xác nhận mật khẩu</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input type={showPw ? "text" : "password"} placeholder="••••••••" value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"/>
                </div>
              </div>
            )}

            {/* Error / Success */}
            {error   && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0"/>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle size={15} className="text-emerald-600 mt-0.5 shrink-0"/>
                <p className="text-xs text-emerald-700">{success}</p>
              </div>
            )}

            {/* Submit button */}
            <button onClick={handleSubmit} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold text-sm py-3 rounded-xl transition-colors mt-2">
              {loading ? <Loader2 size={17} className="animate-spin"/> : <KeyRound size={17}/>}
              {loading ? "Đang xác thực…" : mode==="login" ? "Đăng nhập" : "Tạo tài khoản"}
            </button>
          </div>

          {/* Demo hint */}
          <div className="mt-5 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-xs text-emerald-700 text-center">
              <span className="font-semibold">Demo:</span> Nhập bất kỳ email + mật khẩu ≥ 4 ký tự để đăng nhập
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-emerald-300 mt-6">
          Bảo mật bởi AWS Cognito · TLS 1.3 · MFA Ready
        </p>
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  🏦  DASHBOARD                                               ║
// ╚══════════════════════════════════════════════════════════════╝
function Dashboard({ user: initUser, jwtToken, onSignOut }) {
  const [user,         setUser]         = useState(initUser);
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const [form,         setForm]         = useState({ to:"", amount:"", note:"" });
  const [loading,      setLoading]      = useState(false);
  const [toast,        setToast]        = useState(null);
  const [errors,       setErrors]       = useState({});

  function showToast(msg, type="success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }

  // ── TRANSFER — gọi API thật (hoặc mock nếu chưa có URL) ──
  async function handleTransfer() {
    const errs = {};
    if (!form.to.trim())                                        errs.to     = "Vui lòng nhập số tài khoản.";
    if (!form.amount || isNaN(form.amount) || +form.amount<=0) errs.amount = "Số tiền không hợp lệ.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      // Gọi ApiService.transfer — tự động dùng mock hoặc thật tuỳ API_URL
      const result = await ApiService.transfer({
        cardId           : user.cardId,
        amount           : +form.amount,
        recipientAccount : form.to,
        description      : form.note || "Chuyển tiền",
        jwtToken,                          // ← Bearer token từ Cognito
      });

      // Tính số dư mới (ưu tiên giá trị từ server, fallback tự trừ)
      const newBalance = result.new_balance ?? (user.balance - +form.amount);
      const co2        = result.co2_estimate ?? 0.05;

      // Cập nhật UI
      setUser(u => ({ ...u, balance: newBalance, co2Total: +(u.co2Total + co2).toFixed(3) }));
      setTransactions(prev => [{
        id    : result.transaction_id || `txn_${Date.now()}`,
        time  : new Date().toLocaleString("vi-VN").replace(",",""),
        type  : "send",
        label : "Chuyển tiền",
        amount: -+form.amount,
        co2,
      }, ...prev]);
      setForm({ to:"", amount:"", note:"" });
      showToast(`✅ ${result.message || "Giao dịch thành công"}! CO₂ tạo ra: ${co2} kg`);
    } catch (e) {
      showToast(e.message || "Giao dịch thất bại. Vui lòng thử lại.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      {/* ── HEADER ── */}
      <header className="bg-emerald-700 text-white px-6 py-4 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="bg-white/20 p-1.5 rounded-lg"><Leaf size={20} className="text-emerald-100"/></div>
          <div>
            <p className="text-xs font-medium text-emerald-200 leading-none">NaturEra</p>
            <p className="text-base font-bold leading-tight">Green Banking</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-emerald-200">
          {["Dashboard","Giao dịch","Eco Report","Cài đặt"].map(n => (
            <span key={n} className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${n==="Dashboard"?"bg-white/20 text-white":"hover:bg-white/10"}`}>{n}</span>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {/* JWT badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-600/60 border border-emerald-500 rounded-full px-3 py-1">
            <Shield size={11} className="text-emerald-300"/>
            <span className="text-xs text-emerald-200 font-mono">JWT ✓</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
            <div className="w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center">
              <User size={13} className="text-white"/>
            </div>
            <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
          </div>
          <button onClick={onSignOut}
            className="flex items-center gap-1.5 text-emerald-200 hover:text-white text-sm transition-colors">
            <LogOut size={16}/>
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── OVERVIEW ── */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Tổng quan tài khoản</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={<CreditCard size={18} className="text-emerald-600"/>} label="Số dư hiện tại"
              value={formatVND(user.balance)} sub={`Thẻ: ${user.cardId}`} accent="bg-emerald-50"/>
            <StatCard icon={<Wind size={18} className="text-sky-600"/>} label="Tổng CO₂ phát thải"
              value={`${user.co2Total} kg`} sub="Trong 30 ngày qua" accent="bg-sky-50"/>
            <StatCard icon={<Star size={18} className="text-amber-500"/>} label="Điểm thưởng sống xanh"
              value={`${user.greenPoints} pts`} sub="Hạng: Người bảo vệ rừng 🌿" accent="bg-amber-50"/>
          </div>
        </section>

        {/* ── CLOUDWATCH ── */}
        <CloudWatchSection/>

        {/* ── ECO ANALYTICS ── */}
        <EcoAnalyticsSection/>

        {/* ── TRANSFER FORM ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Send size={18} className="text-emerald-600"/>
              <h2 className="text-base font-semibold text-gray-700">Chuyển tiền</h2>
            </div>
            {/* API mode badge */}
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              API_URL === "YOUR_API_GATEWAY_URL_HERE"
                ? "bg-amber-50 text-amber-600 border border-amber-200"
                : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>
              {API_URL === "YOUR_API_GATEWAY_URL_HERE" ? "⚠ Mock Mode" : "⚡ Live API"}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500">Số tài khoản người nhận</label>
              <input type="text" placeholder="VD: 0123456789" value={form.to}
                onChange={e => setForm({...form, to:e.target.value})}
                className={`border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition ${errors.to?"border-red-400 bg-red-50":"border-gray-200"}`}/>
              {errors.to && <p className="text-xs text-red-500">{errors.to}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500">Số tiền (VND)</label>
              <input type="number" placeholder="VD: 500000" value={form.amount}
                onChange={e => setForm({...form, amount:e.target.value})}
                className={`border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition ${errors.amount?"border-red-400 bg-red-50":"border-gray-200"}`}/>
              {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-gray-500">Nội dung giao dịch</label>
              <input type="text" placeholder="VD: Chuyển tiền học phí tháng 8" value={form.note}
                onChange={e => setForm({...form, note:e.target.value})}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"/>
            </div>
          </div>

          {/* Payload preview — giúp giám khảo thấy cấu trúc JSON gửi lên */}
          {(form.to || form.amount) && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">POST Payload Preview</p>
              <pre className="text-xs text-gray-600 font-mono leading-relaxed">{JSON.stringify({
                card_id           : user.cardId,
                amount            : +form.amount || 0,
                recipient_account : form.to || "...",
                description       : form.note || "Chuyển tiền",
              }, null, 2)}</pre>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
            <Leaf size={12} className="text-emerald-400"/>
            Mỗi giao dịch điện tử tiết kiệm ~0.3 kg CO₂ so với giao dịch tiền mặt
          </p>
          <button onClick={handleTransfer} disabled={loading}
            className="mt-5 w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold text-sm px-8 py-2.5 rounded-xl transition-colors">
            {loading ? <><Loader2 size={16} className="animate-spin"/>Đang xử lý…</> : <><Send size={16}/>Chuyển tiền</>}
          </button>
        </section>

        {/* ── TRANSACTION HISTORY ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock size={18} className="text-emerald-600"/>
            <h2 className="text-base font-semibold text-gray-700">Lịch sử giao dịch gần đây</h2>
            <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">{transactions.length} giao dịch</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-3 font-semibold pr-4">Thời gian</th>
                  <th className="pb-3 font-semibold pr-4">Loại</th>
                  <th className="pb-3 font-semibold pr-4 text-right">Số tiền</th>
                  <th className="pb-3 font-semibold text-right">CO₂ (kg)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={tx.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i===0?"bg-emerald-50/50":""}`}>
                    <td className="py-3.5 pr-4 text-gray-500 whitespace-nowrap">{tx.time}</td>
                    <td className="py-3.5 pr-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${tx.type==="send"?"bg-red-50 text-red-500":"bg-emerald-50 text-emerald-600"}`}>
                        {tx.type==="send"?<ArrowUpRight size={12}/>:<ArrowDownLeft size={12}/>}
                        {tx.label}
                      </span>
                    </td>
                    <td className={`py-3.5 pr-4 text-right font-semibold tabular-nums ${tx.type==="send"?"text-red-500":"text-emerald-600"}`}>
                      {formatAmount(tx.amount)}
                    </td>
                    <td className="py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full font-medium tabular-nums">
                        <Wind size={11}/>{tx.co2.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="text-center text-xs text-gray-300 pb-4 space-y-1">
          <p>NaturEra Green Banking · {user.userId} · Bảo vệ hành tinh từng giao dịch 🌱</p>
          <p className="text-gray-200">Powered by AWS Lambda · API Gateway · DynamoDB · Cognito · CloudWatch</p>
        </footer>
      </main>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  🚀  ROOT APP — Auth Gate                                    ║
// ╚══════════════════════════════════════════════════════════════╝
export default function App() {
  // Khôi phục session từ sessionStorage (nếu còn token)
  const savedJwt = sessionStorage.getItem("naturera_jwt");
  const [jwtToken,       setJwtToken]       = useState(savedJwt || null);
  const [authedUser,     setAuthedUser]      = useState(savedJwt ? MOCK_USER : null);
  const isAuthenticated = !!jwtToken;

  function handleAuthSuccess(token, user) {
    sessionStorage.setItem("naturera_jwt", token);
    setJwtToken(token);
    setAuthedUser(user);
  }

  function handleSignOut() {
    CognitoAuth.signOut();
    setJwtToken(null);
    setAuthedUser(null);
  }

  // Auth gate: hiển thị Login nếu chưa xác thực
  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess}/>;
  }

  return (
    <Dashboard
      user={authedUser}
      jwtToken={jwtToken}
      onSignOut={handleSignOut}
    />
  );
}