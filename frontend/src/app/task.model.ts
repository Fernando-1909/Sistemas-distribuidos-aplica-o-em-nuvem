export type TaskStatus = 'pending' | 'in_progress' | 'done';
export type Priority = 1 | 2 | 3 | 4;

/** ok = encontrado; removed = o id não existe mais; unavailable = o serviço está fora do ar. */
export type RefState = 'ok' | 'removed' | 'unavailable';

export interface Ref {
  id: number;
  name: string | null;
  state: RefState;
  color?: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  responsible_id: number | null;
  project_id: number | null;
  /** Montados pelo tasks-service com dados do users-service e do projects-service. */
  responsible: Ref | null;
  project: Ref | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type TaskInput = Pick<
  Task,
  'title' | 'description' | 'status' | 'priority' | 'due_date' | 'responsible_id' | 'project_id'
>;

export interface Member {
  id: number;
  name: string;
  email: string;
}

export interface Project {
  id: number;
  name: string;
  color: string;
}

export const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'pending', label: 'A fazer' },
  { status: 'in_progress', label: 'Em andamento' },
  { status: 'done', label: 'Concluídas' },
];
