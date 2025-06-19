# TaskWebApp

This is a simple web application for managing tasks, built with Node.js and Express.

## Features
- Add a new task
- View all tasks
- Delete a task

## Getting Started

### Install dependencies
```
npm install
```

### Run the server
```
node index.js
```

The server will start on [http://localhost:3000](http://localhost:3000).

## API Endpoints
- `GET /tasks` - Get all tasks
- `POST /tasks` - Add a new task (JSON body: `{ "title": "Task title" }`)
- `DELETE /tasks/:id` - Delete a task by ID


tasks.csvのタスク情報は以下のフィールドを持つ
タスク管理CSVの各フィールドについて：
    title,taskType,repeatType,interval,weekdays,monthdays,startDate,nextDate,isOverdue,isToday,lastDone
    isToday：
        タスクが今日行うべきかどうかを示すフラグ。trueの場合、今日のタスクとして扱われる。
        毎日時間実行される、タスクの状態を更新するファンクションによってtrue,falseが更新される。
        タスクの新規登録や更新時に、todayの日付とタスクのリピートタイプ、startDate、nextDate、lastDoneを基に計算される。
        タスクのリピートタイプとその日の日付に基づいて、isTodayがtrueかどうかを判断する。
        さらに、タスクタイプがstockの場合は、isOverdueがtrueの場合、isTodayもtrueに設定される。
    isOverdue：
        タスクが期限切れかどうかを示すフラグ。trueの場合、期限切れのタスクとして扱われる。タスクタイプがstockの場合に使用する。
        lastDoneの日付とnextDateの日付に基づいて、isOverdueがtrueかどうかを判断する。
        本来実行されるべき過去の日付にそのタスクが実行されていないとき(lastDone < nextDate < today )、isOverdueがtrueになる。
        初回の実行予定日付で実行されていないとき(nextDate < today)も、isOverdueがtrueになる。
    nextDate：
        タスクの次の実行予定日付。リピートタイプに基づいて計算される。
        タスクのstartDate以降、today以降で指定している周期や曜日、日付に合致する日付が入る
        毎日時間実行される、タスクの状態を更新するファンクションによって更新される。
        タスクの新規登録や更新時に、リピートタイプ、startDate、weekdays、monthdaysを基に計算される。
        ただし、isOverdueがtrueの場合はそのままにする。
    

