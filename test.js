const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);


function getDayOfWeekInJapan(dateString) {
  // 1. 日付文字列とタイムゾーンを渡し、日本時間のdayjsオブジェクトを生成します。
  //    'Asia/Tokyo'を指定することで、「この日付は日本の日付です」と明示します。
  const targetDateInJapan = dayjs.tz(dateString, 'Asia/Tokyo');

  // 2. 渡された文字列が有効な日付かチェックします。
  if (!targetDateInJapan.isValid()) {
    console.error(`無効な日付文字列です: ${dateString}`);
    return null; // 無効な場合は null を返す
  }

  // 3. 有効な日付であれば、.day()で曜日の数値を返します。
  return targetDateInJapan.day();
}

console.log(getDayOfWeekInJapan("2025-01-01"))