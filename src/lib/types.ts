export type TaskColor = "blue" | "green" | "yellow" | "orange" | "purple" | "red";
export type Priority = "low" | "medium" | "high";

export const COLORS: TaskColor[] = ["blue", "green", "yellow", "orange", "purple", "red"];

export interface ChecklistItem {
  id: string;
  task_id: string;
  text: string;
  done: boolean;
  position: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  color: TaskColor;
  label: string | null;
  priority: Priority;
  link_url: string | null;
  due_at: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  tm_checklist_items: ChecklistItem[];
}

export interface Reminder {
  id: string;
  title: string;
  remind_at: string;
  color: TaskColor;
  done: boolean;
  created_at: string;
}

export interface TaskInput {
  title: string;
  description: string | null;
  color: TaskColor;
  label: string | null;
  priority: Priority;
  link_url: string | null;
  due_at: string | null;
  checklist: { text: string; done: boolean }[];
}

export interface ReminderInput {
  title: string;
  remind_at: string;
  color: TaskColor;
}
