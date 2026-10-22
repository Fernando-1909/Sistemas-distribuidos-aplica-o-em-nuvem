export type TaskStatus = 'pending' | 'in_progress' | 'done';
export type Priority = 1 | 2 | 3 | 4;

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  responsible: string;
  priority: Priority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type TaskInput = Pick<
  Task,
  'title' | 'description' | 'status' | 'responsible' | 'priority' | 'due_date'
>;

export const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'pending', label: 'A fazer' },
  { status: 'in_progress', label: 'Em andamento' },
  { status: 'done', label: 'Concluídas' },
];

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 1, label: 'Prioridade 1 · Urgente' },
  { value: 2, label: 'Prioridade 2 · Alta' },
  { value: 3, label: 'Prioridade 3 · Média' },
  { value: 4, label: 'Prioridade 4 · Baixa' },
];
