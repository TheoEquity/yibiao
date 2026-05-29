export type TaskEventType =
  | 'task.created'
  | 'task.progress'
  | 'task.log'
  | 'task.success'
  | 'task.error'
  | 'resource.updated';

export interface TaskStreamEvent {
  type: TaskEventType;
  taskId: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  emittedAt: string;
}
