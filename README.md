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
