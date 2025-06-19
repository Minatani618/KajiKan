// csvUtils.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const CSV_PATH = path.join(__dirname, 'tasks.csv');
const MARKS_CSV_PATH = path.join(__dirname, 'marks.csv');

function readTasksFromCSV() {
  return new Promise((resolve, reject) => {
    const results = [];
    // ファイルが存在しない場合は空配列を返す
    const fileExists = fs.existsSync(CSV_PATH);
    if (!fileExists) {
      resolve([]);
      return;
    }

    // CSVファイルを読み込み、各行をオブジェクトに変換
    fs.createReadStream(CSV_PATH, { encoding: 'utf8' })
      .pipe(csv(['title', 'taskType', 'repeatType', 'interval', 'weekdays', 'monthdays', 'nextDate', 'startDate', 'lastDone', 'isToday', 'isOverdue']))
      .on('data', (data) => {
        if (!data.title || data.title === 'title') return;
        // isTodayとisOverdueをbooleanに変換
        data.isToday = data.isToday === 'true';
        data.isOverdue = data.isOverdue === 'true';
        results.push(data);
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function appendTaskToCSV(task) {
  const title = task.title;
  const taskType = task.taskType;
  const repeatType = task.repeatType || '';
  const interval = task.interval || '';
  const weekdays = task.weekdays || '';
  const monthdays = task.monthdays || '';
  const nextDate = task.nextDate || '';
  const startDate = task.startDate || '';
  const lastDone = task.lastDone || '';
  const isToday = task.isToday;
  const isOverdue = task.isOverdue;
  const line = `"${title}",${taskType},${repeatType},${interval},${weekdays},${monthdays},${nextDate},${startDate},${lastDone},${isToday},${isOverdue}\n`;
  fs.appendFileSync(CSV_PATH, line);
}

function readMarksFromCSV() {
  return new Promise((resolve, reject) => {
    const results = {};
    // ファイルが存在しない場合は空オブジェクトを返す
    const fileExists = fs.existsSync(MARKS_CSV_PATH);
    if (!fileExists) {
      resolve(results);
      return;
    }
    fs.createReadStream(MARKS_CSV_PATH, { encoding: 'utf8' })
      .pipe(csv(['title', 'date']))
      .on('data', (data) => {
        if (!data.title || !data.date) return;
        results[data.title] = data.date;
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function writeMarksToCSV(marks) {
  const header = 'title,date\n';
  console.log(`Writing marks to ${MARKS_CSV_PATH}`);
  const entries = Object.entries(marks);
  const filtered = entries.filter(([title, date]) => title !== 'title' && date !== 'date');
  const lines = filtered.map(([title, date]) => `"${title}",${date}`).join('\n');
  if (lines) {
    fs.writeFileSync(MARKS_CSV_PATH, header + lines + '\n');
  } else {
    fs.writeFileSync(MARKS_CSV_PATH, header);
  }
}

// 指定タイトルのタスクの指定フィールドを更新して保存する
async function updateTaskFieldsByTitle(title, updateFields) {
  const tasks = await readTasksFromCSV();
  let updated = false;
  for (const task of tasks) {
    if (task.title === title) {
      Object.entries(updateFields).forEach(([key, value]) => {
        task[key] = value;
      });
      updated = true;
    }
  }
  if (updated) {
    const header = 'title,taskType,repeatType,interval,weekdays,monthdays,nextDate,startDate,lastDone,isToday,isOverdue\n';
    const lines = tasks.map(t =>
      `"${t.title}",${t.taskType},${t.repeatType || ''},${t.interval || ''},${t.weekdays || ''},${t.monthdays || ''},${t.nextDate || ''},${t.startDate || ''},${t.lastDone || ''},${t.isToday},${t.isOverdue}`
    ).join('\n');
    fs.writeFileSync(CSV_PATH, header + lines + '\n');
  }
  return updated;
}

/**
 * 指定タイトルのタスクを探し、その行のすべてのフィールドをオブジェクトとして返却する
 * @param {string} title - タスクのタイトル
 * @returns {Promise<Object|null>} - 見つかればタスクオブジェクト、なければnull
 */
async function getTaskByTitle(title) {
  const tasks = await readTasksFromCSV();
  const task = tasks.find(t => t.title === title);
  return task || null;
}

module.exports = {
  readTasksFromCSV,
  appendTaskToCSV,
  readMarksFromCSV,
  writeMarksToCSV,
  updateTaskFieldsByTitle,
  getTaskByTitle,
};
