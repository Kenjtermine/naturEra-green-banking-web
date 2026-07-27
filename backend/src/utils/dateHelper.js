async function getPreviousMonthYYYYMM() {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yyyyMM = previousMonth.toISOString().slice(0, 7).replace('-', '');
    return yyyyMM;
}

export default getPreviousMonthYYYYMM;