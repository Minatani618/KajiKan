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
const { readTasksFromCSV, appendTaskToCSV, readMarksFromCSV, writeMarksToCSV, updateTaskFieldsByTitle, getTaskByTitle } = require('./csvUtils');
// 日付関連ユーティリティ
const { getDayOfWeekInJapan, getTodayStrInJapan, getTomorrowStrInJapan, getDiffDays } = require('./dateUtils');
// タスクロジック
const { calculateNextDate, calcNextDateInterval, calcNextDateWeekday, calcNextDateMonthday, classifyTask, classifyIntervalTask, classifyWeekdayTask, classifyMonthdayTask, classifyOnceTask, classifyTasks, filterTodayTasks } = require('./taskLogic');
// バリデーション
const { TASK_REQUIRED_FIELDS, validateTaskFields, validateRequiredFields } = require('./validation');

// --- ルーティングとAPI定義 --- //
// 必須項目定義API
app.get('/api/tasks/fields', (req, res) => {
  res.json(TASK_REQUIRED_FIELDS);
});

// タスク登録
app.post('/api/tasks', async (req, res) => {
  const { title, taskType, repeatType, interval, weekdays, monthdays, nextDate, startDate, lastDone } = req.body;

  // 必須項目バリデーション
  const error = validateRequiredFields(req.body, repeatType, TASK_REQUIRED_FIELDS);
  if (error) {
    return res.status(400).json({ error });
  }

  //新規タスクを追加
  const task = { title, taskType, repeatType, interval, weekdays, monthdays, startDate, lastDone, nextDate: '' };
  await appendTaskToCSV(task);
  
  //nextDateを算出
  const todayStr = getTodayStrInJapan();
  task.nextDate = calculateNextDate(task, todayStr);

  //isTodayを算出
  task.isToday = task.nextDate === todayStr

  // updateTaskFieldsByTitleで該当行のみ更新
  await updateTaskFieldsByTitle(title, {
    nextDate: task.nextDate,
    isToday: task.isToday,
    isOverdue: false,
    isDeleted: false
  });

  res.status(201).json({ message: 'タスクを追加しました' });
});

// タスク一覧API（本日実行対象 or ストック復活分のみ返す、または分類付き）
app.get('/api/tasks', async (req, res) => {
  const classified = req.query.classified === 'true';
  const tasks = await readTasksFromCSV();
  const marks = await readMarksFromCSV();

  // 各タスクにisMarkedフィールドを追加
  const tasksWithMark = tasks.map(task => {
    const isMarked = !!marks[task.title]; // マークされているかどうか
    return { ...task, isMarked };
  });

  // isDeletedがtrueのものは除外
  const validTasks = tasksWithMark.filter(task => !task.isDeleted);

  if (classified) {
    // 今日やるものとそれ以外に分類して返却
    const todo = validTasks.filter(task => task.isToday);
    const other = validTasks.filter(task => !task.isToday);
    return res.json({ todo, other });
  } else {
    return res.json(validTasks);
  }
});

// タスク編集
app.put('/api/tasks/:title', async (req, res) => {
  const { title } = req.params;
  const { title: newTitle, taskType: newTaskType, repeatType, interval, weekdays, monthdays, startDate, lastDone } = req.body;

  //CSVから該当タスクを取得
  const task = await getTaskByTitle(title);
  if (!task) return res.status(404).json({ error: 'タスクが見つかりません' });

  //リクエストボディの値で上書き
  const updatedTask = {
    ...task,
    title: newTitle,
    taskType: newTaskType,
    repeatType,
    interval,
    weekdays,
    monthdays,
    startDate,
    lastDone
  };

  //nextdate算出
  const todayJSTDate = getTodayStrInJapan();
  updatedTask.nextDate = calculateNextDate(updatedTask, todayJSTDate);

  //isTodayを算出
  const todayStr = todayJSTDate.toISOString().slice(0, 10);
  updatedTask.isToday = updatedTask.nextDate === todayStr;

  //updateTaskFieldsByTitleで該当行のみ更新
  await updateTaskFieldsByTitle(title, {
    title: updatedTask.title,
    taskType: updatedTask.taskType,
    repeatType: updatedTask.repeatType,
    interval: updatedTask.interval,
    weekdays: updatedTask.weekdays,
    monthdays: updatedTask.monthdays,
    startDate: updatedTask.startDate,
    lastDone: updatedTask.lastDone,
    nextDate: updatedTask.nextDate,
    isToday: updatedTask.isToday,
    isOverdue: updatedTask.isOverdue
  });

  res.json({ message: 'タスクを編集しました' });
});

// タスク実行記録API
app.post('/api/tasks/:title/done', async (req, res) => {
  const { title } = req.params;
  let tasks = await readTasksFromCSV();
  const today = getTodayStrInJapan();
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
  const header = 'title,taskType,repeatType,interval,weekdays,monthdays,nextDate,startDate,lastDone,isToday,isOverdue,isDeleted\n';
  const lines = updated.map(t => `"${t.title}",${t.taskType},${t.repeatType || ''},${t.interval || ''},${t.weekdays || ''},${t.monthdays || ''},${t.nextDate || ''},${t.startDate || ''},${t.lastDone || ''}`).join('\n');
  fs.writeFileSync(CSV_PATH, header + lines + '\n');
  res.json({ message: removed ? '一回限りタスクを完了し削除しました' : 'タスクを実行済みにしました' });
});

// マーク一覧取得API
app.get('/api/tasks/marks', async (req, res) => {
  const marks = await readMarksFromCSV();
  res.json(marks);
});

// タスクのマーク状態を更新
app.post('/api/tasks/:title/mark', async (req, res) => {
  const { title } = req.params;
  const { marked } = req.body;
  const marks = await readMarksFromCSV();
  const today = getTodayStrInJapan();

  //対象タスクのマーク状態を更新
  if (marked) {
    marks[title] = today; //マーク追加
  } else {
    delete marks[title]; //マーク削除
  }

  writeMarksToCSV(marks);
  res.json({ success: true });
});

// タスク削除
app.delete('/api/tasks/:title', async (req, res) => {
  const { title } = req.params;
  const task = await getTaskByTitle(title);
  console.log(task);
  if (!task) {
    return res.status(404).json({ message: 'タスクが見つかりません' });
  }
  await updateTaskFieldsByTitle(title, { isDeleted: true });
  res.json({ message: 'タスクを削除しました' });
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

//タスクの状態更新
async function updateTasksForNewDay() {
  const todayStr = getTodayStrInJapan();
  const tomorrowStr = getTomorrowStrInJapan();


  const marks = await readMarksFromCSV();
  const tasks = await readTasksFromCSV();

  const updatedTasks = tasks.map(task => {

    //そもそも未来のタスクは更新しない
    if (new Date(task.nextDate) > todayStr) {
      return task;
    }

    // marksの内容によってlastDoneを更新
    if (marks[task.title] === todayStr) {
      task.lastDone = todayStr;
      task.isOverdue = false;
    }

    // isOverdueを更新
    if (task.taskType === 'stock' && task.nextDate <= todayStr && task.lastDone < todayStr) {
      task.isOverdue = true; // ストックタスクで次回実行日が今日以前で、まだ実行していない場合は期限切れ
    }else {
      task.isOverdue = false; // それ以外は期限切れではない
    }

    // nextDateとisTodayを更新
    if (task.taskType === 'stock' && task.isOverdue) {   //stockタスクで期限切れの場合
      task.nextDate = tomorrowStr; 
      task.isToday = true; 
    }else{                                               //それ以外(stockタスクだが遅延なくやっているorポイントタスク)
      task.nextDate = calculateNextDate(task, tomorrowStr);
      task.isToday = task.nextDate === tomorrowStr;
    }

    return task;
  });

  // tasks.csvを更新
  const header = 'title,taskType,repeatType,interval,weekdays,monthdays,nextDate,startDate,lastDone,isToday,isOverdue,isDeleted\n';
  const lines = updatedTasks.map(t =>
    `"${t.title}",${t.taskType || ''},${t.repeatType || ''},${t.interval || ''},${t.weekdays || ''},${t.monthdays || ''},${t.nextDate || ''},${t.startDate || ''},${t.lastDone || ''},${t.isToday},${t.isOverdue}`
  ).join('\n');
  fs.writeFileSync(CSV_PATH, header + lines + '\n');

  // マークをリセット
  writeMarksToCSV({});
}

// 状態更新関数を毎日23:55に実行する
function scheduleUpdateTasks() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // JST
  const millisUntil2355 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 55, 0).getTime() - now.getTime();
  setTimeout(() => {
    updateTasksForNewDay();
    setInterval(updateTasksForNewDay, 24 * 60 * 60 * 1000); // 24時間ごとに実行
  }, millisUntil2355);
}

updateTasksForNewDay(); // テスト実行
scheduleUpdateTasks();
