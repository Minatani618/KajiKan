// dateUtils.js
function getTodayJST() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function getTodayJSTDate() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function getJSTDay(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const jstDate = new Date(Date.UTC(y, m, d, 0, 0, 0));
  return jstDate.getUTCDay();
}

function getDiffDays(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
}

module.exports = {
  getTodayJST,
  getTodayJSTDate,
  getJSTDay,
  getDiffDays
};
