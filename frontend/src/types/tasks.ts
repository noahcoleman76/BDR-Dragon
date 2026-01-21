export type TaskListType = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM";

export type TaskList = {
  id: string;
  userId: string;
  name: string;
  type: TaskListType;
  createdAt: string;
  updatedAt: string;
};

export type TaskStatus = "OPEN" | "COMPLETED";
export type RecurrenceType = "NONE" | "DAILY" | "WEEKLY";

export type Task = {
  id: string;
  userId: string;
  taskListId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TaskStatus;
  recurrenceType: RecurrenceType;
  createdAt: string;
  updatedAt: string;
};
