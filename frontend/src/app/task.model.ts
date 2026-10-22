export type TaskStatus = 'pending' | 'in_progress' | 'done';

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  responsible: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type TaskInput = Pick<Task, 'title' | 'description' | 'status' | 'responsible'>;

export const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'pending', label: 'A fazer' },
  { status: 'in_progress', label: 'Em andamento' },
  { status: 'done', label: 'Concluídas' },
];
