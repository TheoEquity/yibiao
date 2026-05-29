const { createJsonStore } = require('./jsonStore');

const store = createJsonStore('tasks.json', [], {
  key: 'tasks',
});

const tasks = store.read();
const subscribers = new Set();

function now() {
  return new Date().toISOString();
}

function persistTasks() {
  store.write(tasks);
  store.exportToLegacyJson(tasks);
}

function createTask({ type, resourceType, resourceId, message }) {
  const task = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    status: 'queued',
    progress: 0,
    resourceType,
    resourceId,
    message: message || '任务已创建',
    createdAt: now(),
    updatedAt: now(),
  };
  tasks.unshift(task);
  persistTasks();
  emit('task.created', task, { message: task.message });
  return task;
}

function updateTask(taskId, partial) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return null;
  }

  Object.assign(task, partial, { updatedAt: now() });
  persistTasks();

  const eventType = task.status === 'success'
    ? 'task.success'
    : task.status === 'error'
      ? 'task.error'
      : 'task.progress';

  emit(eventType, task, {
    progress: task.progress,
    status: task.status,
    message: task.message,
  });

  return task;
}

function emit(type, task, payload) {
  const event = {
    type,
    taskId: task.id,
    resourceType: task.resourceType,
    resourceId: task.resourceId,
    payload,
    emittedAt: now(),
  };

  for (const response of subscribers) {
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}

function subscribe(response) {
  subscribers.add(response);
  response.on('close', () => subscribers.delete(response));
}

module.exports = {
  tasks,
  createTask,
  persistTasks,
  updateTask,
  subscribe,
};
