const { getTodayStrInJapan, getDiffDays, getDayOfWeekInJapan, getTargetDayOfMonth, calculateDate } = require('./dateUtils');

function calculateNextDate(task, baseDateStr) {
  const baseDate = (task.startDate > baseDateStr) ? task.startDate : baseDateStr;

  if (task.repeatType === 'interval') {
    return calcNextDateInterval(task, baseDate);
  } else if (task.repeatType === 'weekday') {
    return calcNextDateWeekday(task, baseDate);
  } else if (task.repeatType === 'monthday') {
    return calcNextDateMonthday(task, baseDate);
  } else if (task.repeatType === 'once') {
    return calcNextDateOnce(task, baseDate);
  }
  return '';
}

function calcNextDateInterval(task, baseDate) {
  const interval = parseInt(task.interval, 10);
  const lastDone = task.lastDone || null;
  let nextDate;
  // 初回登録時 (nextDateがない場合) はstartDateをnextDateにする
  if (!task.nextDate) {
    return baseDate;
  }

  // pointタスクの場合かまだ一度も実行されたことのないstockタスクの場合、基準日以降で周期に合致する最も近い日付を計算する
  if (task.taskType === 'point' || !lastDone) {
    nextDate = calculateDate(baseDate, interval);
    while (nextDate < baseDate) {
      nextDate = calculateDate(baseDate, interval);
    }
    return nextDate
  }

  // stockタスクの場合、lastDoneからinterval日後の日付を計算する
  if (task.taskType === 'stock') {
    nextDate = calculateDate(lastDone, interval);
    while (nextDate < baseDate) {
      nextDate = calculateDate(baseDate, interval);
    }
    return nextDate
  }

  console.log(`Unknown task type: ${task.taskType}`);
}

function calcNextDateWeekday(task, baseDate) {
  const weekdays = (task.weekdays || '').split('-').map(s => s.trim()).filter(Boolean).map(Number);
  const baseWeekday = getDayOfWeekInJapan(baseDate);
  if (weekdays.includes(baseWeekday)) {
    return baseDate
  }
  let minDiff = 7;
  for (const wd of weekdays) {
    let diff = (wd - baseWeekday + 7) % 7;
    if (diff === 0) diff = 7;
    if (diff < minDiff) minDiff = diff;
  }
  const next = calculateDate(baseDate, minDiff);
  return next
}

function calcNextDateMonthday(task, baseDate) {
  const monthdays = (task.monthdays || '').split('-').map(s => parseInt(s, 10)).filter(Boolean);
  const baseDay = getTargetDayOfMonth(baseDate);
  if (monthdays.includes(baseDay)) {
    return baseDate;
  }
  let minDiff = 32;
  for (const d of monthdays) {
    let diff = d - baseDay;
    if (diff < 0) diff += 31;
    if (diff < minDiff) minDiff = diff;
  }
  const next = calculateDate(baseDate, minDiff);
  return next
}

function calcNextDateOnce(task, baseDate) {
  const baseDateStr = baseDate
  //初回
  if (!task.nextDate) {
    if (task.startDate < baseDateStr){
      return baseDateStr;
    }else{
      return task.startDate;
    }
  }

  return baseDateStr;
}


function classifyTask(task, marks, today, todayStr, todayWeekday, todayDate) {
  let isToday = false;
  let msg = '';
  let nextExecDate = null;

  // isTodayの計算
  if (task.repeatType === 'interval') {
    ({ isToday, msg, nextExecDate } = classifyIntervalTask(task, todayStr));
  } else if (task.repeatType === 'weekday') {
    ({ isToday, msg, nextExecDate } = classifyWeekdayTask(task, today, todayWeekday));
  } else if (task.repeatType === 'monthday') {
    ({ isToday, msg, nextExecDate } = classifyMonthdayTask(task, today, todayDate));
  } else if (task.repeatType === 'once') {
    ({ isToday, msg, nextExecDate } = classifyOnceTask(task, todayStr));
  }

  // isOverdueはCSVから読み込んだ値をそのまま使用
  const taskObj = isToday
    ? { ...task, marked: marks[task.title] === todayStr }
    : { ...task, msg, nextExecDate };

  return { isToday, taskObj };
}

function classifyIntervalTask(task, todayStr) {
  const interval = parseInt(task.interval, 10);
  const lastDone = task.lastDone || null;
  let nextDate;
  if (lastDone) {
    nextDate= calculateDate(lastDone, interval);
  } else {
    nextDate = new Date(task.startDate);
  }
  while (nextDate.toISOString().slice(0, 10) < todayStr) {
    nextDate= calculateDate(nextDate, interval);
  }
  const nextDateStr = nextDate.toISOString().slice(0, 10);
  const isToday = (todayStr === nextDateStr);
  const nextExecDate = nextDateStr;
  let msg = '';
  if (!isToday) msg = todayStr < nextDateStr ? `あと${getDiffDays(todayStr, nextDateStr)}日で実行予定` : '未定義';
  return { isToday, msg, nextExecDate };
}

function classifyWeekdayTask(task, today, todayWeekday) {
  const weekdays = (task.weekdays || '')
    .split('-')
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number);
  let isToday = false;
  let msg = '';
  let nextExecDate = null;
  if (weekdays.length === 0) {
    msg = '曜日指定なし';
    return { isToday, msg, nextExecDate };
  }
  if (weekdays.includes(todayWeekday) &&task.lastDone < today.toISOString().slice(0, 10)) {
    isToday = true;
    msg = '本日実行';
  }
  let minDiff = 7;
  for (const wd of weekdays) {
    let diff = (wd - todayWeekday + 7) % 7;
    if (diff === 0) diff = 7;
    if (diff < minDiff) minDiff = diff;
  }
  
  nextExecDate = calculateDate(today, minDiff);
  return { isToday, msg, nextExecDate };
}

function classifyMonthdayTask(task, today, todayDate) {
  const monthdays = (task.monthdays || '').split('-').map(s => parseInt(s, 10)).filter(Boolean);
  const isToday = monthdays.includes(todayDate);
  let minDiff = 32;
  for (const d of monthdays) {
    let diff = d - todayDate;
    if (diff < 0) diff += 31;
    if (diff < minDiff) minDiff = diff;
  }
  const nextExecDate = calculateDate(today, minDiff);
  let msg = '';
  if (!isToday) msg = `次回: ${monthdays.join('-')}日`;
  return { isToday, msg, nextExecDate };
}

function classifyOnceTask(task, todayStr) {
  let isToday = false;
  // 一回でも完了していれば表示しない
  if (task.lastDone && task.lastDone !== "") {
    return { isToday: false, msg: '', nextExecDate: task.nextDate };
  }
  //ポイントタスクの場合 次回実行と今日の日付が同じ場合のみ今日のタスクとする
  isToday = task.taskType === 'point' && task.nextDate === todayStr ? true : false ;
  //ストックタスクの場合 次回実行が今日の日付より前の日付であれば今日のタスクとする
  isToday = task.taskType === 'stock' && task.nextDate <= todayStr ? true : isToday ;
  const nextExecDate = task.nextDate;
  let msg = '';
  if (!isToday) msg = `実行日: ${task.nextDate}`;
  return { isToday, msg, nextExecDate };
}

function filterUncompletedOnceTasks(tasks) {
  return tasks.filter(task => {
    if (task.repeatType === 'once') {
      return !task.lastDone || task.lastDone === '';
    }
    return true;
  });
}

function classifyTasks(tasks, marks, today, todayStr, todayWeekday, todayDate) {
  // onceタスクでlastDoneが空でない（＝既に実行済み）は除外
  const filteredTasks = tasks.filter(task => {
    if (task.repeatType === 'once') {
      const isUncompleted = !task.lastDone || task.lastDone === '';
      if (!isUncompleted) {
        return false;
      }
    }
    return true;
  });
  return filteredTasks.map(task => {
    const { isToday, taskObj } = classifyTask(task, marks, today, todayStr, todayWeekday, todayDate);
    return { isToday, task: taskObj };
  });
}

function filterTodayTasks(tasks, todayStr) {
  return tasks.filter(task => {
    if (task.repeatType === 'once') {
      return task.nextDate === todayStr;
    } else if (task.repeatType === 'interval') {
      const nextDate = calcNextDateInterval(task, new Date());
      return nextDate === todayStr;
    } else if (task.repeatType === 'weekday') {
      const weekdays = (task.weekdays || '').split('-').map(s => s.trim()).filter(Boolean).map(Number);
      return weekdays.includes(getDayOfWeekInJapan(todayStr));
    } else if (task.repeatType === 'monthday') {
      const monthdays = (task.monthdays || '').split('-').map(s => parseInt(s, 10)).filter(Boolean);
      return monthdays.includes(new Date().getDate());
    }
    return false;
  });
}

function updateTaskState(task, todayStr) {
  // isOverdueの計算
  if (task.taskType === 'stock' && task.nextDate < todayStr && (!task.lastDone || task.lastDone < task.nextDate)) {
    task.isOverdue = true;
  } else {
    task.isOverdue = false;
  }

  // isOverdueがtrueならisTodayも必ずtrue
  if (task.isOverdue) {
    task.isToday = true;
  } else {
    // nextDateが空、またはisOverdue=falseかつnextDateが過去なら再計算
    if (!task.nextDate || task.nextDate < todayStr) {
      task.nextDate = calculateNextDate(task, todayStr);
    }
    // isTodayの判定
    task.isToday = task.nextDate === todayStr;
  }

  return task;
}

module.exports = {
  calculateNextDate,
  calcNextDateInterval,
  calcNextDateWeekday,
  calcNextDateMonthday,
  classifyTask,
  classifyIntervalTask,
  classifyWeekdayTask,
  classifyMonthdayTask,
  classifyOnceTask,
  classifyTasks,
  filterTodayTasks,
  updateTaskState
};