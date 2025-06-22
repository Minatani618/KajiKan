const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

//曜日を返却　0:日曜日, 1:月曜日, 2:火曜日, 3:水曜日, 4:木曜日, 5:金曜日, 6:土曜日
function getDayOfWeekInJapan(dateString) {
  const targetDateInJapan = dayjs.tz(dateString, 'Asia/Tokyo');
  return targetDateInJapan.day();
}

//YYYY-MM-DD 形式で日本の日付を返却
function getTodayStrInJapan() {
  const nowInJapan = dayjs().tz('Asia/Tokyo');
  const todayStr = nowInJapan.format('YYYY-MM-DD');
  return todayStr;
}

// 明日の日付を返却
function getTomorrowStrInJapan() {
  const tomorrowInJapan = dayjs().tz('Asia/Tokyo').add(1, 'day');
  const tomorrowStr = tomorrowInJapan.format('YYYY-MM-DD');
  return tomorrowStr;
}

//二つの日付の差分日数算出
function getDiffDays(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
}

//日付から日数を抽出
function  getTargetDayOfMonth(dateString) {
  const dayOfMonth = dayjs(dateString).date();
  return dayOfMonth;
  // 出力: number
}

//日付に日数を足し引き
function calculateDate(dateString, days) {
  const originalDate = dayjs(dateString);
  const newDate = originalDate.add(days, 'day');
  return newDate.format('YYYY-MM-DD');
}
  
module.exports = {
  getDayOfWeekInJapan,
  getTodayStrInJapan,
  getTomorrowStrInJapan,
  getDiffDays,
  getTargetDayOfMonth,
  calculateDate
};



