import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TaskForm } from './task-form';
import { COLUMNS, Task, TaskInput, TaskStatus } from './task.model';
import { TaskService } from './task.service';

const NEXT: Record<TaskStatus, { to: TaskStatus; label: string }> = {
  pending: { to: 'in_progress', label: 'Iniciar' },
  in_progress: { to: 'done', label: 'Concluir' },
  done: { to: 'pending', label: 'Reabrir' },
};

@Component({
  selector: 'app-root',
  imports: [FormsModule, TaskForm],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly api = inject(TaskService);

  protected readonly columns = COLUMNS;
  protected readonly next = NEXT;

  protected readonly tasks = signal<Task[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly search = signal('');

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Task | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.tasks();
    return this.tasks().filter((t) =>
      [t.title, t.description, t.responsible].some((v) => v.toLowerCase().includes(q)),
    );
  });

  protected readonly total = computed(() => this.tasks().length);
  protected readonly doneCount = computed(
    () => this.tasks().filter((t) => t.status === 'done').length,
  );
  protected readonly percent = computed(() =>
    this.total() ? Math.round((this.doneCount() / this.total()) * 100) : 0,
  );

  constructor() {
    this.load();
  }

  protected byStatus(status: TaskStatus): Task[] {
    return this.filtered().filter((t) => t.status === status);
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  }

  protected load() {
    this.loading.set(true);
    this.loadError.set('');
    this.api.list().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(
          'Não foi possível falar com a API. No plano gratuito do Render ela dorme após 15 minutos sem uso — tente de novo em alguns segundos.',
        );
        this.loading.set(false);
      },
    });
  }

  protected openNew() {
    this.editing.set(null);
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected openEdit(task: Task) {
    this.editing.set(task);
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected closeForm() {
    this.formOpen.set(false);
  }

  protected save(input: TaskInput) {
    this.saving.set(true);
    this.formError.set('');
    const current = this.editing();
    const request = current ? this.api.update(current.id, input) : this.api.create(input);

    request.subscribe({
      next: (saved) => {
        this.tasks.update((list) =>
          current ? list.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...list],
        );
        this.saving.set(false);
        this.formOpen.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(
          err.status === 400
            ? 'Confira os campos e tente novamente.'
            : 'Não foi possível salvar. Tente novamente em instantes.',
        );
      },
    });
  }

  protected move(task: Task) {
    this.api.update(task.id, { status: NEXT[task.status].to }).subscribe({
      next: (saved) => this.tasks.update((list) => list.map((t) => (t.id === saved.id ? saved : t))),
      error: () => this.loadError.set('Não foi possível atualizar a tarefa. Tente de novo.'),
    });
  }

  protected remove(task: Task) {
    if (!confirm(`Excluir a tarefa "${task.title}"?`)) return;
    this.api.remove(task.id).subscribe({
      next: () => this.tasks.update((list) => list.filter((t) => t.id !== task.id)),
      error: () => this.loadError.set('Não foi possível excluir a tarefa. Tente de novo.'),
    });
  }
}
