# ARCHITECTURE.md — Green Banking Backend

**Dùng file này để:** Tìm hiểu "tại sao" mỗi thiết kế, không phải để hỏi "sao không làm cách khác"?

---

## 1️⃣ Kiến Trúc 4 Lớp (Bắt Buộc Theo Thứ Tự Phụ Thuộc)

```
┌──────────────┐
│ functions/   │  (Lambda handler — CHỈ parse input, gọi 1 hàm service, format response)
└──────┬───────┘
       ↓
┌──────────────────┐
│ services/        │  (business logic: thứ tự bước, điều kiện, throw AppError)
└──────┬───────────┘
       ↓
┌──────────────────┐
│ repositories/    │  (thao tác dữ liệu thuần túy — không biết "vì sao" được gọi)
└──────┬───────────┘
       ↓
┌────────────────────────────────────────┐
│ models/ + utils/ + config/             │  (không phụ thuộc lớp nào ở trên)
└────────────────────────────────────────┘
```

### Quy Tắc Phân Biệt Nhanh

| Code Pattern                                 | Layer        | ✅ OK | ❌ NOT OK                  |
| -------------------------------------------- | ------------ | ----- | -------------------------- |
| `new QueryCommand()` / `new UpdateCommand()` | repositories | ✓     | ❌ service, functions      |
| `if (co2 >= quota)` (nghiệp vụ)              | services     | ✓     | ❌ repositories, functions |
| `JSON.parse(event.body)`                     | functions    | ✓     | ❌ services, repositories  |
| `throw new AppError(...)`                    | services     | ✓     | repositories (rethrow)     |

**Kết Quả:** Dễ debug, dễ test, dễ refactor.

---

## 2️⃣ ADR-001: TransactWriteItems (Không Saga/Step Functions)

**Quyết Định:** Core Banking (trừ tiền + ghi log + cộng CO2) = **1 lệnh `TransactWriteItems` atomic duy nhất**

### Lý Do

- Core Banking hiện là nội bộ (không gọi service ngoài)
- Tất cả 3 thao tác ghi (debit, transaction, stat) cần **all-or-nothing**
- DynamoDB tự đảm bảo atomicity → không cần Step Functions
- Không cần code compensate/rollback tay

### Hệ Quả

- `debitAndRecordTransaction()` = 1 hàm thực hiện 4 `TransactItems` (thứ tự quan trọng)
- Lỗi ở item thứ i → toàn bộ rollback, không ai bị trừ tiền hay ghi log nửa chừng
- `ConditionalCheck` (không ghi gì) dùng để chặn nếu điều kiện vi phạm

---

## 3️⃣ ADR-002: Least-Privilege IAM — KHÔNG BAO GIỜ `dynamodb:Scan`

**Quyết Định:** Không cấp permission `Scan` cho Lambda, dù từ policy manager có vẻ nó "safe"

### Vấn Đề Thật Sự

- `dynamodb:LeadingKeys` (giới hạn theo `USER#*`) **bị Scan bỏ qua hoàn toàn**
- Nếu Lambda có `Scan` permission → có thể đọc tất cả user data (VD `ADMIN#*`, `STAFF#*`)
- Đã verify qua [AWS docs chính thức](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_dynamodb_items.html)

### Hệ Quả

- **Không dùng `DynamoDBCrudPolicy`** (policy SAM mẫu cấp Scan)
- Viết `Statement` tay, **liệt kê đúng action cần** (`GetItem`, `PutItem`, `UpdateItem`, `TransactWriteItems`, `Query`)
- Mọi truy vấn "nhiều user cùng lúc" (Monthly Batch) **PHẢI dùng `Query` trên GSI**

### Code Example (✅ Correct IAM Policy)

```yaml
- Effect: Allow
  Action:
    - dynamodb:Query # ✅ Có
    - dynamodb:GetItem # ✅ Có
    - dynamodb:UpdateItem # ✅ Có
    - dynamodb:TransactWriteItems # ✅ Có
  Resource: !GetAtt Table.Arn
  # ❌ NO Scan, NO BatchWriteItem, NO DeleteItem
```

---

## 4️⃣ ADR-003: Khóa Thẻ NGAY KHI VƯỢT Hạn Mức (Real-Time)

**Quyết Định:** Giao dịch làm CO2 vượt hạn = **giao dịch được phép thành công** (giọt nước tràn ly), chỉ giao dịch tiếp theo bị chặn

### Lý Do

- Tương tự thẻ ngân hàng thật: giao dịch cuối cùng dù vượt hạn mức vẫn qua, chỉ giao dịch sau bị từ chối
- Không cần chờ cuối tháng để "recover"

### Hệ Quả

#### Trong Transaction Flow

```
User swipe card
    ↓
Validate input
    ↓
Calculate CO2
    ↓
TransactWriteItems:
  ├─ Debit balance (PROFILE)
  ├─ ✅ ConditionCheck: CARD#{cardId} không có LockedFlag
  ├─ Record transaction (TXN#)
  └─ Add CO2 (STAT#)
    ↓
If transaction success AND co2 >= quota:
    ↓
    🔴 Call updateCardStatus(userId, cardId, 'LOCKED')
    ↓
    (Giao dịch TIẾP THEO sẽ fail ở ConditionCheck)
```

#### Trong Monthly Batch

- **KHÔNG còn** nhiệm vụ "check ai vượt hạn mức"
- **CHỈ còn 2 việc độc lập:**
  1. Mở khóa toàn bộ thẻ đang LOCKED → `updateCardStatus(userId, cardId, 'ACTIVE')`
  2. Xét thưởng user dưới ngưỡng CO2 tháng vừa đóng sổ

---

## 5️⃣ Schema DynamoDB (Single-Table)

**Bảng:** `NaturEraGreenBankingTable`

### Primary Keys

| Entity           | PK              | SK                                | Ý Nghĩa                    |
| ---------------- | --------------- | --------------------------------- | -------------------------- |
| **Profile**      | `USER#{userId}` | `PROFILE`                         | Account (balance, info)    |
| **Card**         | `USER#{userId}` | `CARD#{cardId}`                   | Thẻ (LockedFlag, LockedAt) |
| **Transaction**  | `USER#{userId}` | `TXN#{createdAt}#{transactionId}` | Lịch sử giao dịch          |
| **Monthly Stat** | `USER#{userId}` | `STAT#{YYYY-MM}`                  | Thống kê CO2 hàng tháng    |

### Global Secondary Indexes (GSI)

#### GSI 1: `StatMonthIndex`

- **PK (Hash):** `StatMonth` (value: `STAT#YYYY-MM`)
- **SK (Range):** `totalCo2Kg` (numeric, ascending)
- **Use:** Monthly Batch query user dưới ngưỡng thưởng theo tháng
- **Query:** `StatMonth = STAT#2026-07 AND totalCo2Kg < 250`
- **Projection:** INCLUDE (`userId`, `rewardedThisMonth`, `rewardedAt`)

#### GSI 2: `LockedCardIndex` (Sparse)

- **PK (Hash):** `LockedFlag` (value: `'true'` — **STRING**, không BOOL)
- **SK (Range):** `LockedAt` (timestamp, ascending)
- **Use:** Query user bị khóa (chỉ item có `LockedFlag` mới xuất hiện)
- **Query:** `LockedFlag = 'true'`
- **Projection:** INCLUDE (`userId`, `cardId`)
- **Lợi Ích Sparse:** Tránh hot partition (không all cards trong 1 partition, chỉ locked cards)

---

## 6️⃣ ⚠️ Data Type Critical Issues

### ❌ **BLOCKER: `LockedFlag` phải là STRING, không BOOL**

**Vấn Đề:**

```javascript
// ❌ WRONG (đã sửa)
ExpressionAttributeValues: { ':true': true }  // JavaScript BOOL

// ✅ CORRECT
ExpressionAttributeValues: { ':true': 'true' }  // JavaScript STRING
```

**Lý Do:**

- Template.yaml khai báo: `LockedFlag: AttributeType: S` (String)
- DynamoDB **bắt buộc** kiểu dữ liệu ghi = khai báo
- Nếu ghi BOOL vào chỗ khai S → `ValidationException: Type mismatch for Index Key LockedFlag Expected: S Actual: BOOL`
- **DynamoDB không cho phép Boolean làm GSI key** (chỉ nhận S/N/B)

**Các Chỗ Đã Sửa:**

1. `updateCardStatus()` LOCKED branch: `:true: 'true'`
2. `queryCurrentlyLockedUsers()`: `:true: 'true'`
3. `markUserRewarded()`: `:true: 'true'` (consistency)

---

## 7️⃣ Quy Ước Đặt Tên (Đừng Đổi Lại Nữa)

| Tên         | ✅ ĐÚNG          | ❌ SAI                                   |
| ----------- | ---------------- | ---------------------------------------- |
| Số tiền VND | `amount`         | `amountVnd`, `amountInVND`               |
| CO2 gram    | `co2Amount`      | `co2Kg`, `co2InKg`                       |
| Số dư VND   | `balance`        | `balanceVnd`, `balanceInVND`             |
| File repo   | `accountRepo.js` | `accountRepository.js`, `AccountRepo.js` |

**Lý Do:**

- Đã có nhiều file, field không consistent gây lỗi tích hợp âm thầm
- Ví dụ: Code A dùng `balance`, Code B dùng `balanceVnd` → trả về `undefined` khi gộp object
- Không crash, chỉ dữ liệu sai im lặng

**Quy Tắc Khi Cần Đổi:**

- Sửa **toàn bộ project cùng lúc** (1 PR)
- Không sửa rải rác từng file
- Update `ARCHITECTURE.md` nếu đổi

---

## 8️⃣ Error Handling Pattern

**Kiến Trúc Error:**

```
service/
  throw AppError('CODE', 'message', statusCode)
    ↓
Lambda handler (functions/)
  ❌ KHÔNG catch-return (là sai cách)
  ✅ THROW lỗi ra ngoài
    ↓
    API Gateway (HTTP) → 502 + error details
    EventBridge (async) → mark Failed, auto-retry 2x, DLQ
```

**AppError Attributes:**

- `errorCode`: `'INSUFFICIENT_FUNDS'`, `'CARD_LOCKED'`, etc.
- `message`: User-facing message (Vietnamese)
- `statusCode`: HTTP status (402, 403, 409, 500)

---

## 9️⃣ Testing Strategy (Not in MVP, but plan v2)

```
Unit Tests (repositories/)
  ✅ queryUsersUnderQuotaForMonth() mocked DDB
  ✅ updateCardStatus() error handling

Integration Tests (services/)
  ✅ processTransaction() happy path
  ✅ processTransaction() insufficient funds
  ✅ monthlyOffsetBatch() unlock + reward

E2E Tests (functions/)
  ✅ POST /v1/transactions → success
  ✅ POST /v1/transactions → 402 Insufficient funds
```

---

## 🔟 Deployment & Monitoring

### Pre-Deployment Checks

- [ ] `LockedFlag` data type = STRING (not BOOL)
- [ ] No `Scan` action in IAM policies
- [ ] All imports ESM (not mixed CommonJS)
- [ ] sam build succeeds
- [ ] template.yaml valid

### Post-Deployment Monitoring

- CloudWatch Logs: `[TransactionInterceptor]`, `[MonthlyOffsetBatch]`
- DynamoDB Metrics: read/write capacity, throttling
- Lambda Metrics: duration, errors, concurrent executions
- EventBridge: monthly batch execution history

---

## 📝 Document History

| Version | Date       | Changes                                                 |
| ------- | ---------- | ------------------------------------------------------- |
| 1.0     | 2026-07-27 | Initial architecture document, fix LockedFlag data type |

---

**Last Updated:** 2026-07-27  
**Maintained By:** Dev Team  
**Status:** Locked for MVP (discuss changes before modifying)
