// csvUtils.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const CSV_PATH = path.join(__dirname, 'tasks.csv');
const MARKS_CSV_PATH = path.join(__dirname, 'marks.csv');

function readTasksFromCSV() {
  return new Promise((resolve, reject) => {
    const results = [];
    if (!fs.existsSync(CSV_PATH)) return resolve([]);
    fs.createReadStream(CSV_PATH, { encoding: 'utf8' })
      .pipe(csv(['title', 'taskType', 'repeatType', 'interval', 'weekdays', 'monthdays', 'nextDate', 'startDate', 'lastDone']))
      .on('data', (data) => {
        if (!data.title || data.title === 'title') return;
        results.push(data);
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function appendTaskToCSV(task) {
  const line = `"${task.title}",${task.taskType},${task.repeatType || ''},${task.interval || ''},${task.weekdays || ''},${task.monthdays || ''},${task.nextDate || ''},${task.startDate || ''},${task.lastDone || ''}\n`;
  fs.appendFileSync(CSV_PATH, line);
}

function readMarksFromCSV() {
  return new Promise((resolve, reject) => {
    const results = {};
    if (!fs.existsSync(MARKS_CSV_PATH)) return resolve(results);
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
  const lines = Object.entries(marks)
    .filter(([title, date]) => title !== 'title' && date !== 'date')
    .map(([title, date]) => `"${title}",${date}`)
    .join('\n');
  fs.writeFileSync(MARKS_CSV_PATH, header + (lines ? lines + '\n' : ''));
}

module.exports = {
  readTasksFromCSV,
  appendTaskToCSV,
  readMarksFromCSV,
  writeMarksToCSV
};
