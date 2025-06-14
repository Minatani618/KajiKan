const express = require('express');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3010;
const CSV_PATH = path.join(__dirname, 'tasks.csv');
const MARKS_CSV_PATH = path.join(__dirname, 'marks.csv');

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CSV関連ユーティリティ
const { readTasksFromCSV, appendTaskToCSV, readMarksFromCSV, writeMarksToCSV } = require('./csvUtils');
// 日付関連ユーティリティ
const { getTodayJST, getTodayJSTDate, getJSTDay, getDiffDays } = require('./dateUtils');
// タスクロジック
const { calculateNextDate, calcNextDateInterval, calcNextDateWeekday, calcNextDateMonthday, classifyTask, classifyIntervalTask, classifyWeekdayTask, classifyMonthdayTask, classifyOnceTask, classifyTasks, filterTodayTasks } = require('./taskLogic');
// バリデーション
const { TASK_REQUIRED_FIELDS, validateTaskFields } = require('./validation');

// --- ルーティングとAPI定義 --- //
// 必須項目定義API
app.get('/api/tasks/fields', (req, res) => {
  res.json(TASK_REQUIRED_FIELDS);
});

// タスク登録
app.post('/api/tasks', (req, res) => {
  const { title, taskType, repeatType, interval, weekdays, monthdays, nextDate, startDate, lastDone } = req.body;
  // 必須項目バリデーション
  const common = TASK_REQUIRED_FIELDS.common;
  const byType = TASK_REQUIRED_FIELDS.byRepeatType[repeatType] || [];
  for (const f of common) {
    if (!req.body[f]) {
      return res.status(400).json({ error: `${f}は必須です` });
    }
  }
  for (const f of byType) {
    if (!req.body[f]) {
      return res.status(400).json({ error: `${f}は必須です（${repeatType}）` });
    }
  }
  // nextDateを自動算出
  const todayJSTDate = getTodayJSTDate();
  const task = { title, taskType, repeatType, interval, weekdays, monthdays, startDate, lastDone };
  task.nextDate = calculateNextDate(task, todayJSTDate);
  appendTaskToCSV(task);
  res.status(201).json({ message: 'タスクを追加しました' });
});

// タスク一覧API（本日実行対象 or ストック復活分のみ返す、または分類付き）
app.get('/api/tasks', async (req, res) => {
  const classified = req.query.classified === 'true';
  const tasks = await readTasksFromCSV();
  const marks = await readMarksFromCSV();
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000); // JST
  const todayStr = today.toISOString().slice(0, 10);
  const todayWeekday = getJSTDay(today);
  const todayDate = today.getDate();
  if (!classified) {
    // 本日実行対象 or ストック復活分のみ返す
    const filtered = filterTodayTasks(tasks, todayStr);
    return res.json(filtered);
  } else {
    // 分類付き返却
    const classifiedArr = classifyTasks(tasks, marks, today, todayStr, todayWeekday, todayDate);
    // {todo: [...], other: [...]} の形に変換
    const todo = [], other = [];
    classifiedArr.forEach(item => {
      if (item.isToday) todo.push(item.task);
      else other.push(item.task);
    });
    return res.json({ todo, other });
  }
});

// タスク編集
app.put('/api/tasks/:title', async (req, res) => {
  const { title } = req.params;
  const { title: newTitle, taskType: newTaskType, repeatType, interval, weekdays, monthdays, nextDate, startDate, lastDone } = req.body;
  // 必須項目バリデーション
  const common = TASK_REQUIRED_FIELDS.common;
  const byType = TASK_REQUIRED_FIELDS.byRepeatType[repeatType] || [];
  for (const f of common) {
    if (!req.body[f]) {
      return res.status(400).json({ error: `${f}は必須です` });
    }
  }
  for (const f of byType) {
    if (!req.body[f]) {
      return res.status(400).json({ error: `${f}は必須です（${repeatType}）` });
    }
  }
  const tasks = await readTasksFromCSV();
  let updated = false;
  const todayJSTDate = getTodayJSTDate();
  const newTasks = tasks.map(task => {
    if (task.title === title) {
      updated = true;
      // nextDateを自動算出
      const newTask = { ...task, title: newTitle, taskType: newTaskType, repeatType, interval, weekdays, monthdays, startDate, lastDone };
      newTask.nextDate = calculateNextDate(newTask, todayJSTDate);
      return newTask;
    }
    return task;
  });
  if (!updated) return res.status(404).json({ error: 'タスクが見つかりません' });
  // 上書き保存
  const header = 'title,taskType,repeatType,interval,weekdays,monthdays,nextDate,startDate,lastDone\n';
  const lines = newTasks.map(t => `"${t.title}",${t.taskType},${t.repeatType || ''},${t.interval || ''},${t.weekdays || ''},${t.monthdays || ''},${t.nextDate || ''},${t.startDate || ''},${t.lastDone || ''}`).join('\n');
  fs.writeFileSync(CSV_PATH, header + lines + '\n');

  // マーク情報も更新
  const marks = await readMarksFromCSV();
  if (marks[title]) {
    marks[newTitle] = marks[title];
    delete marks[title];
    writeMarksToCSV(marks);
  }

  res.json({ message: 'タスクを編集しました' });
});

// タスク実行記録API
app.post('/api/tasks/:title/done', async (req, res) => {
  const { title } = req.params;
  let tasks = await readTasksFromCSV();
  const today = getTodayJST();
  let removed = false;
  tasks = tasks.filter(task => {
    if (task.title === title && task.repeatType === 'once') {
      removed = true;
      return false; // 一回限りタスクは削除
    }
    return true;
  });
  const updated = tasks.map(task => {
    if (task.title === title) {
      return { ...task, lastDone: today };
    }
    return task;
  });
  const header = 'title,taskType,repeatType,interval,weekdays,monthdays,nextDate,startDate,lastDone\n';
  const lines = updated.map(t => `"${t.title}",${t.taskType},${t.repeatType || ''},${t.interval || ''},${t.weekdays || ''},${t.monthdays || ''},${t.nextDate || ''},${t.startDate || ''},${t.lastDone || ''}`).join('\n');
  fs.writeFileSync(CSV_PATH, header + lines + '\n');
  res.json({ message: removed ? '一回限りタスクを完了し削除しました' : 'タスクを実行済みにしました' });
});

// マーク一覧取得API
app.get('/api/tasks/marks', async (req, res) => {
  const marks = await readMarksFromCSV();
  res.json(marks);
});

// タスクのマーク状態を保存
app.post('/api/tasks/:title/mark', async (req, res) => {
  const { title } = req.params;
  const { marked } = req.body;
  const marks = await readMarksFromCSV();
  const today = getTodayJST();
  if (marked) {
    marks[title] = today;
  } else {
    delete marks[title];
  }
  writeMarksToCSV(marks);
  res.json({ success: true });
});

// すべてのマーク済みタスクを完了にするAPI
app.post('/api/tasks/marks/complete', async (req, res) => {
  const tasks = await readTasksFromCSV();
  const marks = await readMarksFromCSV();
  const today = getTodayJST();
  let updated = false;
  const updatedTasks = tasks.map(task => {
    if (marks[task.title] === today) {
      updated = true;
      return { ...task, lastDone: today };
    }
    return task;
  });
  if (updated) {
    const header = 'title,taskType,repeatType,interval,weekdays,monthdays,nextDate,startDate,lastDone\n';
    const lines = updatedTasks.map(t => `"${t.title}",${t.taskType},${t.repeatType || ''},${t.interval || ''},${t.weekdays || ''},${t.monthdays || ''},${t.nextDate || ''},${t.startDate || ''},${t.lastDone || ''}`).join('\n');
    fs.writeFileSync(CSV_PATH, header + lines + '\n');
    Object.keys(marks).forEach(title => {
      if (marks[title] === today) delete marks[title];
    });
    writeMarksToCSV(marks);
  }
  res.json({ message: updated ? 'すべてのマーク済みタスクを完了にしました' : 'マーク済みタスクはありません' });
});

// ページルーティング
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.get('/list', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'list.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// === サーバー側 0時スケジューラ ===
function scheduleServerMidnightTask() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // JST
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  setTimeout(async () => {
    const today = getTodayJST();
    const marks = await readMarksFromCSV();
    const tasks = await readTasksFromCSV();
    let updated = false;
    const updatedTasks = tasks.map(task => {
      if (marks[task.title] === today) {
        updated = true;
        return { ...task, lastDone: today };
      }
      return task;
    });
    if (updated) {
      const header = 'title,interval,startDate,lastDone\n';
      const lines = updatedTasks.map(t => `"${t.title}",${t.interval},${t.startDate},${t.lastDone || ''}`).join('\n');
      fs.writeFileSync(CSV_PATH, header + lines + '\n');
    }
    // マークもリセット
    writeMarksToCSV({});
    scheduleServerMidnightTask();
  }, next - now);
}
scheduleServerMidnightTask();
