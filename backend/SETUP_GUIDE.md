# 🚀 Setup Guide: Deploy to AWS (MVP)

## 📋 Điều Kiện Tiên Quyết

- ✅ AWS Account (có IAM user với quyền CloudFormation, Lambda, DynamoDB, EventBridge)
- ✅ AWS CLI v2 configured (khóa access key)
- ✅ Node.js 20.x
- ✅ AWS SAM CLI cài đặt: `npm install -g aws-sam-cli`

---

## 🔐 Step 1: Configure AWS CLI

```bash
aws configure
# Nhập:
# AWS Access Key ID: [your-key-id]
# AWS Secret Access Key: [your-secret]
# Default region: ap-southeast-1 (Singapore)
# Default output format: json
```

**Kiểm tra:**

```bash
aws sts get-caller-identity
# Output: { "Account": "xxx", "UserId": "xxx", "Arn": "arn:aws:iam::xxx:user/your-username" }
```

---

## 📦 Step 2: Build Project

```bash
cd backend

# Install dependencies
npm install

# Build Lambda functions (transpile if using ES6)
npm run build  # (nếu có script build trong package.json)
```

---

## 🛠️ Step 3: Deploy with CloudFormation

### **Option A: Dùng AWS SAM (Recommended)**

```bash
# 1. Build application
sam build

# 2. Deploy (interactive)
sam deploy --guided

# Khi được hỏi, điền:
# Stack name: naturera-green-banking-dev
# Region: ap-southeast-1
# Confirm changes before deploy: Y
# Allow SAM CLI to create IAM roles: Y
# Disable rollback: N
# Save parameters: Y
```

### **Option B: Dùng AWS CloudFormation Console**

1. **Tới AWS Console** → CloudFormation
2. **Create Stack** → Upload file `template.yaml`
3. **Stack name:** `naturera-green-banking-dev`
4. **Tiếp tục** → Review → Create Stack
5. **Chờ** tới khi Status = `CREATE_COMPLETE`

---

## ✅ Step 4: Verify Deployment

### **Kiểm tra CloudFormation Stack:**

```bash
aws cloudformation describe-stacks \
  --stack-name naturera-green-banking-dev \
  --region ap-southeast-1
```

### **Kiểm tra Lambda Functions:**

```bash
# Transaction Interceptor
aws lambda get-function \
  --function-name naturera-green-banking-dev-TransactionInterceptor \
  --region ap-southeast-1

# Monthly Offset Batch
aws lambda get-function \
  --function-name naturera-green-banking-dev-MonthlyOffsetBatch \
  --region ap-southeast-1
```

### **Kiểm tra DynamoDB Table:**

```bash
aws dynamodb describe-table \
  --table-name NaturEraGreenBankingTable \
  --region ap-southeast-1
```

### **Kiểm tra EventBridge Rule:**

```bash
aws events list-rules \
  --name-prefix naturera \
  --region ap-southeast-1
```

---

## 🧪 Step 5: Test Tính Năng

### **Test 1: Gọi Transaction API**

```bash
ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name naturera-green-banking-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

echo "API Endpoint: $ENDPOINT"

# Gọi API test
curl -X POST "$ENDPOINT/transactions" \
  -H "Content-Type: application/json" \
  -d '{
    "cardId": "card_001",
    "userId": "user_123",
    "amount": 100,
    "merchantId": "merch_456",
    "mcc": "5411",
    "posDeviceId": "pos_789"
  }'
```

### **Test 2: Check Lambda Logs**

```bash
# Xem logs transaction interceptor
aws logs tail /aws/lambda/naturera-green-banking-dev-TransactionInterceptor --follow

# Xem logs batch job
aws logs tail /aws/lambda/naturera-green-banking-dev-MonthlyOffsetBatch --follow
```

### **Test 3: Query DynamoDB**

```bash
# Check user data
aws dynamodb get-item \
  --table-name NaturEraGreenBankingTable \
  --key '{"PK":{"S":"USER#user_123"},"SK":{"S":"PROFILE"}}' \
  --region ap-southeast-1
```

---

## 🚀 Step 6: Trigger Monthly Batch Manually (Dev Testing)

```bash
# Trigger Lambda manually (không chờ schedule)
aws lambda invoke \
  --function-name naturera-green-banking-dev-MonthlyOffsetBatch \
  --payload '{}' \
  --region ap-southeast-1 \
  /tmp/response.json

# Xem kết quả
cat /tmp/response.json
```

---

## 📊 Step 7: Monitor & Logs

### **CloudWatch Logs**

```bash
# Xem tất cả logs từ stack
aws logs describe-log-groups --query 'logGroups[?contains(logGroupName, `naturera`)].logGroupName'
```

### **DynamoDB Metrics**

- Tới AWS Console → DynamoDB → Tables → `NaturEraGreenBankingTable`
- Xem tab **Metrics** để monitor read/write capacity

### **Lambda Metrics**

- Tới AWS Console → Lambda → Functions
- Chọn function → **Monitor** tab
- Xem Duration, Error rate, Invocations

---

## 🧹 Step 8: Cleanup (Xóa Stack)

```bash
aws cloudformation delete-stack \
  --stack-name naturera-green-banking-dev \
  --region ap-southeast-1

# Kiểm tra deletion status
aws cloudformation describe-stacks \
  --stack-name naturera-green-banking-dev \
  --region ap-southeast-1
# Status sẽ thành DELETE_COMPLETE hoặc Stack không tồn tại
```

---

## 🐛 Troubleshooting

### **1. CloudFormation Failed**

```bash
aws cloudformation describe-stack-events \
  --stack-name naturera-green-banking-dev \
  --query 'StackEvents[0:5]'  # Show 5 recent events
```

### **2. Lambda Timeout**

- Tăng `Timeout` trong `template.yaml` → Global Functions
- Mặc định là 10s, batch job cần 300s

### **3. Permission Denied**

```bash
# Check IAM role của Lambda
aws iam get-role \
  --role-name naturera-green-banking-dev-MonthlyOffsetBatchRole

# Check attached policies
aws iam list-role-policies \
  --role-name naturera-green-banking-dev-MonthlyOffsetBatchRole
```

### **4. DynamoDB Throttling**

- Table dùng `PAY_PER_REQUEST` (on-demand) → tự động scale
- Nếu vẫn throttle, check CloudWatch metrics

---

## 📝 Environment Variables

Các biến định nghĩa trong `template.yaml` Globals:

| Biến                 | Giá Trị                     | Ý Nghĩa                    |
| -------------------- | --------------------------- | -------------------------- |
| `TABLE_NAME`         | `NaturEraGreenBankingTable` | Tên DynamoDB table         |
| `CARBON_QUOTA_LIMIT` | `1000`                      | Hạn mức CO2 mỗi tháng (kg) |
| `REWARD_THRESHOLD`   | `300`                       | Ngưỡng tặng reward (kg)    |
| `AWS_REGION`         | `ap-southeast-1`            | Region AWS                 |

**Thay đổi:**

1. Sửa `template.yaml` → Environment Variables
2. Chạy lại `sam deploy`

---

## 🎯 MVP Checklist

- [ ] AWS Account setup
- [ ] AWS CLI configured
- [ ] Deploy stack thành công
- [ ] Lambda functions chạy không lỗi
- [ ] DynamoDB table tồn tại + GSI ok
- [ ] Test transaction API pass
- [ ] Test monthly batch pass
- [ ] CloudWatch logs normal
- [ ] EventBridge schedule ok (trigger 1st day 00:00 UTC)

---

## 🚨 Known Limitations (MVP v1)

- ⚠️ **Một user = một thẻ duy nhất** (chưa hỗ trợ nhiều thẻ)
- ⚠️ **Không có authentication** (chỉ dùng cardId/userId)
- ⚠️ **No API rate limiting** (cần thêm vào production)
- ⚠️ **DynamoDB on-demand** (chi phí cao khi scale, cần switch sang provisioned)
- ⚠️ **Monthly batch chạy tuần tự** (chỉ tối ưu 1000-10000 users)

---

## 📞 Support

Nếu có lỗi:

1. Check CloudWatch Logs
2. Run `sam logs -t` để xem real-time logs
3. Kiểm tra IAM permissions
4. Recheck `template.yaml` syntax

**Liên hệ:** [DevOps team]
