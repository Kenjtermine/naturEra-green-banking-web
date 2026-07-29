/**
 * Từ điển ánh xạ Mã MCC (Merchant Category Code) sang Danh mục
 */
const MCC_DICTIONARY = {
    "5814": "COFFEE_SHOP",
    "5411": "SUPERMARKET",
    "4111": "TRANSPORT",
    "4511": "AIRLINE",
    "5812": "RESTAURANT"
};

/**
 * Hàm dịch mã MCC thành Tên danh mục (Có fallback nếu mã lạ)
 */
function getCategoryFromMcc(mcc) {
    if (!mcc) return "OTHER";
    return MCC_DICTIONARY[mcc.toString()] || "OTHER";
}

export default getCategoryFromMcc;