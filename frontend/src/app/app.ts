import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Icon, IconName } from './icon';
import { TaskForm } from './task-form';
import { COLUMNS, Task, TaskInput, TaskStatus } from './task.model';
import { TaskService } from './task.service';

type Filter = 'all' | TaskStatus | `who:${string}`;
type ViewMode = 'list' | 'board';

const AVATAR_COLORS = ['#b59cf5', '#ec9fc7', '#9fa8f2', '#d8a0ee', '#f0a8a8', '#8fb6ec'];

const EMPTY_TEXT: Record<string, [string, string]> = {
  all: ['Nenhuma tarefa ainda', 'Adicione a primeira tarefa para começar.'],
  pending: ['Nada a fazer por aqui', 'Todas as tarefas já foram iniciadas.'],
  in_progress: ['Nenhuma tarefa em andamento', 'Inicie uma tarefa da lista “A fazer”.'],
  done: ['Nenhuma tarefa concluída', 'As tarefas concluídas aparecem aqui.'],
  who: ['Sem tarefas para esta pessoa', 'Atribua uma tarefa pelo campo “Responsável”.'],
};

@Component({
  selector: 'app-root',
  imports: [FormsModule, Icon, TaskForm],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly api = inject(TaskService);
  private readonly draftTitle = viewChild<ElementRef<HTMLInputElement>>('draftTitle');

  protected readonly columns = COLUMNS;
  protected readonly navItems: { key: Filter; label: string; icon: IconName }[] = [
    { key: 'all', label: 'Todas', icon: 'inbox' },
    { key: 'pending', label: 'A fazer', icon: 'circle' },
    { key: 'in_progress', label: 'Em andamento', icon: 'progress' },
    { key: 'done', label: 'Concluídas', icon: 'done' },
  ];

  protected readonly tasks = signal<Task[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly search = signal('');
  protected readonly filter = signal<Filter>('all');
  protected readonly view = signal<ViewMode>('list');
  protected readonly navOpen = signal(false);

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Task | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly composing = signal(false);
  protected draft = { title: '', description: '', responsible: '' };

  protected readonly counts = computed(() => {
    const c = { all: 0, pending: 0, in_progress: 0, done: 0 };
    for (const t of this.tasks()) {
      c.all++;
      c[t.status]++;
    }
    return c;
  });

  protected readonly people = computed(() => {
    const map = new Map<string, number>();
    for (const t of this.tasks()) {
      if (t.responsible) map.set(t.responsible, (map.get(t.responsible) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  });

  protected readonly visible = computed(() => {
    const f = this.filter();
    const q = this.search().trim().toLowerCase();
    return this.tasks().filter((t) => {
      if (f.startsWith('who:') && t.responsible !== f.slice(4)) return false;
      if (['pending', 'in_progress', 'done'].includes(f) && t.status !== f) return false;
      if (!q) return true;
      return [t.title, t.description, t.responsible].some((v) => v.toLowerCase().includes(q));
    });
  });

  protected readonly title = computed(() => {
    const f = this.filter();
    if (f.startsWith('who:')) return f.slice(4);
    return this.navItems.find((n) => n.key === f)?.label ?? 'Todas';
  });

  /** Na lista, agrupa por status (exceto quando já há um filtro de status). */
  protected readonly sections = computed(() => {
    const f = this.filter();
    const list = this.visible();
    if (f === 'pending' || f === 'in_progress' || f === 'done') {
      return list.length ? [{ status: f, label: '', tasks: list }] : [];
    }
    return COLUMNS.map((c) => ({
      status: c.status,
      label: c.label,
      tasks: list.filter((t) => t.status === c.status),
    })).filter((s) => s.tasks.length);
  });

  protected readonly emptyText = computed(() => {
    const q = this.search().trim();
    if (q) return [`Nada encontrado para “${q}”`, 'Tente outro termo de busca.'];
    const f = this.filter();
    return EMPTY_TEXT[f.startsWith('who:') ? 'who' : f];
  });

  protected readonly percent = computed(() => {
    const { all, done } = this.counts();
    return all ? Math.round((done / all) * 100) : 0;
  });

  constructor() {
    this.load();
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(e: KeyboardEvent) {
    const el = e.target as HTMLElement;
    if (e.metaKey || e.ctrlKey || e.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
    if (e.key === 'q' && !this.formOpen()) {
      e.preventDefault();
      this.openNew();
    } else if (e.key === '/') {
      e.preventDefault();
      document.getElementById('search')?.focus();
    }
  }

  protected color(name: string): string {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  }

  protected setFilter(f: Filter) {
    this.filter.set(f);
    this.navOpen.set(false);
    this.composing.set(false);
  }

  protected filterWho(name: string) {
    this.setFilter(`who:${name}`);
  }

  protected countOf(key: Filter): number {
    return this.counts()[key as 'all' | TaskStatus] ?? 0;
  }

  protected canCompose(): boolean {
    return this.filter() !== 'done';
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
          'Não foi possível falar com a API. No plano gratuito do Render ela dorme após 15 minutos sem uso; tente de novo em alguns segundos.',
        );
        this.loading.set(false);
      },
    });
  }

  // ---- composer inline -----------------------------------------------------
  protected openComposer() {
    const f = this.filter();
    this.draft = { title: '', description: '', responsible: f.startsWith('who:') ? f.slice(4) : '' };
    this.composing.set(true);
    queueMicrotask(() => this.draftTitle()?.nativeElement.focus());
  }

  protected addDraft() {
    const title = this.draft.title.trim();
    if (!title) return;
    const f = this.filter();
    const status: TaskStatus = f === 'in_progress' ? 'in_progress' : 'pending';
    this.api.create({ ...this.draft, title, status }).subscribe({
      next: (saved) => {
        this.tasks.update((list) => [saved, ...list]);
        this.draft = { ...this.draft, title: '', description: '' };
        this.draftTitle()?.nativeElement.focus();
      },
      error: () => this.loadError.set('Não foi possível criar a tarefa. Tente de novo.'),
    });
  }

  // ---- modal (nova / editar) ----------------------------------------------
  protected openNew() {
    this.editing.set(null);
    this.formError.set('');
    this.formOpen.set(true);
    this.navOpen.set(false);
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

  // ---- ações nas tarefas ---------------------------------------------------
  private change(task: Task, status: TaskStatus) {
    this.api.update(task.id, { status }).subscribe({
      next: (saved) => this.tasks.update((list) => list.map((t) => (t.id === saved.id ? saved : t))),
      error: () => this.loadError.set('Não foi possível atualizar a tarefa. Tente de novo.'),
    });
  }

  protected toggle(task: Task) {
    this.change(task, task.status === 'done' ? 'pending' : 'done');
  }

  protected start(task: Task) {
    this.change(task, 'in_progress');
  }

  protected remove(task: Task) {
    if (!confirm(`Excluir a tarefa "${task.title}"?`)) return;
    this.api.remove(task.id).subscribe({
      next: () => this.tasks.update((list) => list.filter((t) => t.id !== task.id)),
      error: () => this.loadError.set('Não foi possível excluir a tarefa. Tente de novo.'),
    });
  }

  protected byStatus(status: TaskStatus): Task[] {
    return this.visible().filter((t) => t.status === status);
  }
}
