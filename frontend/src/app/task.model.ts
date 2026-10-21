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

export const COLUMNS: { status: TaskStatus; label: string; hint: string }[] = [
  { status: 'pending', label: 'A fazer', hint: 'Nada por aqui. Crie uma tarefa para começar.' },
  { status: 'in_progress', label: 'Em andamento', hint: 'Mova uma tarefa para cá quando começar.' },
  { status: 'done', label: 'Concluídas', hint: 'As tarefas finalizadas aparecem aqui.' },
];
