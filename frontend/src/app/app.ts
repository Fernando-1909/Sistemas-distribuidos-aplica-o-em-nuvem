import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { addDays, diffDays, dueInfo, longDay, todayISO } from './dates';
import { Icon, IconName } from './icon';
import { PriorityPicker } from './priority-picker';
import { TaskForm } from './task-form';
import { COLUMNS, Member, Priority, Project, Ref, Task, TaskInput, TaskStatus } from './task.model';
import { MemberService, ProjectService, TaskService } from './task.service';

type Filter = 'today' | 'upcoming' | 'all' | TaskStatus | `who:${number}` | `project:${number}`;
type ViewMode = 'list' | 'board';
type Section = { key: string; label: string; sub?: string; danger?: boolean; tasks: Task[] };

const PROJECT_COLORS = ['#d93e72', '#9b7bd0', '#4c8df6', '#f59a3d', '#3fae7a', '#d68aa8'];

const EMPTY_TEXT: Record<string, [string, string]> = {
  today: ['Dia livre!', 'Nenhuma tarefa para hoje.'],
  upcoming: ['Nada agendado', 'Defina uma data de entrega ao criar uma tarefa.'],
  all: ['Nenhuma tarefa ainda', 'Adicione a primeira tarefa para começar.'],
  pending: ['Nada a fazer por aqui', 'Todas as tarefas já foram iniciadas.'],
  in_progress: ['Nenhuma tarefa em andamento', 'Inicie uma tarefa da lista “A fazer”.'],
  done: ['Nenhuma tarefa concluída', 'As tarefas concluídas aparecem aqui.'],
  who: ['Sem tarefas para esta pessoa', 'Escolha o responsável ao criar uma tarefa.'],
  project: ['Nenhuma tarefa neste projeto', 'Escolha o projeto ao criar uma tarefa.'],
};

const byPriorityThenDue = (a: Task, b: Task) =>
  a.priority - b.priority ||
  (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') ||
  b.created_at.localeCompare(a.created_at);

@Component({
  selector: 'app-root',
  imports: [FormsModule, Icon, PriorityPicker, TaskForm],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly api = inject(TaskService);
  private readonly membersApi = inject(MemberService);
  private readonly projectsApi = inject(ProjectService);
  private readonly draftTitle = viewChild<ElementRef<HTMLInputElement>>('draftTitle');

  protected readonly columns = COLUMNS;
  protected readonly dueInfo = dueInfo;
  protected readonly statusNav: { key: TaskStatus; label: string; icon: IconName }[] = [
    { key: 'pending', label: 'A fazer', icon: 'circle' },
    { key: 'in_progress', label: 'Em andamento', icon: 'progress' },
    { key: 'done', label: 'Concluídas', icon: 'done' },
  ];

  protected readonly today = signal(todayISO());
  protected readonly tasks = signal<Task[]>([]);
  protected readonly members = signal<Member[]>([]);
  protected readonly projects = signal<Project[]>([]);
  protected readonly membersDown = signal(false);
  protected readonly projectsDown = signal(false);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly search = signal('');
  protected readonly filter = signal<Filter>('all');
  protected readonly view = signal<ViewMode>('list');
  protected readonly navOpen = signal(false);
  protected readonly theme = signal<'dark' | 'light'>(
    document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark',
  );

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Task | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly composing = signal(false);
  protected readonly composerError = signal('');
  protected draft = this.blankDraft();

  protected readonly adding = signal<'member' | 'project' | null>(null);
  protected newName = '';

  protected readonly counts = computed(() => {
    const today = this.today();
    const c = { all: 0, pending: 0, in_progress: 0, done: 0, today: 0, upcoming: 0 };
    for (const t of this.tasks()) {
      c.all++;
      c[t.status]++;
      if (t.status !== 'done' && t.due_date) {
        if (t.due_date <= today) c.today++;
        else c.upcoming++;
      }
    }
    return c;
  });

  private openCount(field: 'responsible_id' | 'project_id') {
    const map = new Map<number, number>();
    for (const t of this.tasks()) {
      const id = t[field];
      if (id !== null && t.status !== 'done') map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }
  protected readonly memberCounts = computed(() => this.openCount('responsible_id'));
  protected readonly projectCounts = computed(() => this.openCount('project_id'));

  /** Algum nome não pôde ser carregado porque um serviço está fora do ar. */
  protected readonly degraded = computed(() =>
    this.tasks().some((t) => t.responsible?.state === 'unavailable' || t.project?.state === 'unavailable'),
  );

  protected readonly visible = computed(() => {
    const f = this.filter();
    const today = this.today();
    const q = this.search().trim().toLowerCase();
    const who = f.startsWith('who:') ? Number(f.slice(4)) : null;
    const project = f.startsWith('project:') ? Number(f.slice(8)) : null;
    return this.tasks().filter((t) => {
      const open = t.status !== 'done';
      if (f === 'today' && !(open && t.due_date && t.due_date <= today)) return false;
      if (f === 'upcoming' && !(open && t.due_date && t.due_date > today)) return false;
      if (who !== null && t.responsible_id !== who) return false;
      if (project !== null && t.project_id !== project) return false;
      if (['pending', 'in_progress', 'done'].includes(f) && t.status !== f) return false;
      if (!q) return true;
      return [t.title, t.description, t.responsible?.name ?? '', t.project?.name ?? ''].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  });

  protected readonly title = computed(() => {
    const f = this.filter();
    if (f.startsWith('who:')) {
      return this.members().find((m) => m.id === Number(f.slice(4)))?.name ?? 'Responsável';
    }
    if (f.startsWith('project:')) {
      return this.projects().find((p) => p.id === Number(f.slice(8)))?.name ?? 'Projeto';
    }
    if (f === 'today') return 'Hoje';
    if (f === 'upcoming') return 'Em breve';
    if (f === 'all') return 'Todas as tarefas';
    return this.statusNav.find((n) => n.key === f)?.label ?? 'Tarefas';
  });

  protected readonly subtitle = computed(() =>
    this.filter() === 'today' ? longDay(this.today()) : '',
  );

  protected readonly sections = computed<Section[]>(() => {
    const f = this.filter();
    const today = this.today();
    const list = [...this.visible()].sort(byPriorityThenDue);

    if (f === 'today') {
      const overdue = list.filter((t) => t.due_date! < today);
      const now = list.filter((t) => t.due_date === today);
      return [
        { key: 'overdue', label: 'Atrasadas', danger: true, tasks: overdue },
        { key: 'today', label: 'Hoje', tasks: now },
      ].filter((s) => s.tasks.length);
    }
    if (f === 'upcoming') {
      const days = [...new Set(list.map((t) => t.due_date!))].sort();
      return days.map((d) => ({
        key: d,
        label: diffDays(d, today) === 1 ? 'Amanhã' : longDay(d),
        sub: diffDays(d, today) === 1 ? longDay(d) : '',
        tasks: list.filter((t) => t.due_date === d),
      }));
    }
    if (f === 'pending' || f === 'in_progress' || f === 'done') {
      return list.length ? [{ key: f, label: '', tasks: list }] : [];
    }
    return COLUMNS.map((c) => ({
      key: c.status,
      label: c.label,
      tasks: list.filter((t) => t.status === c.status),
    })).filter((s) => s.tasks.length);
  });

  protected readonly emptyText = computed(() => {
    const q = this.search().trim();
    if (q) return [`Nada encontrado para “${q}”`, 'Tente outro termo de busca.'];
    const f = this.filter();
    const key = f.startsWith('who:') ? 'who' : f.startsWith('project:') ? 'project' : f;
    return EMPTY_TEXT[key];
  });

  protected readonly percent = computed(() => {
    const { all, done } = this.counts();
    return all ? Math.round((done / all) * 100) : 0;
  });

  constructor() {
    this.load();
    this.loadMembers();
    this.loadProjects();
  }

  private blankDraft() {
    return {
      title: '',
      description: '',
      due_date: '',
      priority: 4 as Priority,
      responsible_id: null as number | null,
      project_id: null as number | null,
    };
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

  protected toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    document.documentElement.dataset['theme'] = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* armazenamento indisponível: só não persiste */
    }
  }

  // ---- apresentação de referências a outros serviços ------------------------
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  }

  protected avatar(ref: Ref): string {
    return ref.state === 'ok' && ref.name ? this.initials(ref.name) : '?';
  }

  protected refLabel(ref: Ref, noun: string): string {
    if (ref.state === 'ok' && ref.name) return ref.name;
    return ref.state === 'removed' ? `${noun} removido` : 'indisponível';
  }

  private apiMessage(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 0) return 'Sem conexão com o servidor. Tente novamente em instantes.';
    if (err.status === 503 && typeof err.error?.detail === 'string') return err.error.detail;
    if (err.status === 400 && err.error && typeof err.error === 'object') {
      const first = Object.values(err.error)[0];
      const msg = Array.isArray(first) ? first[0] : first;
      if (typeof msg === 'string') return msg;
    }
    return fallback;
  }

  // ---- navegação ----------------------------------------------------------------
  protected setFilter(f: Filter) {
    this.filter.set(f);
    this.navOpen.set(false);
    this.composing.set(false);
  }

  protected filterWho(id: number) {
    this.setFilter(`who:${id}`);
  }

  protected filterProject(id: number) {
    this.setFilter(`project:${id}`);
  }

  protected countOf(key: Filter): number {
    return this.counts()[key as keyof ReturnType<typeof this.counts>] ?? 0;
  }

  protected canCompose(): boolean {
    return this.filter() !== 'done';
  }

  // ---- carregamento: cada serviço falha de forma independente ------------------
  protected load() {
    this.loading.set(true);
    this.loadError.set('');
    this.today.set(todayISO());
    this.api.list().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(
          'Não foi possível falar com o serviço de tarefas. No plano gratuito do Render ele dorme após 15 minutos sem uso; tente de novo em alguns segundos.',
        );
        this.loading.set(false);
      },
    });
  }

  protected loadMembers() {
    this.membersDown.set(false);
    this.membersApi.list().subscribe({
      next: (list) => this.members.set(list),
      error: () => this.membersDown.set(true),
    });
  }

  protected loadProjects() {
    this.projectsDown.set(false);
    this.projectsApi.list().subscribe({
      next: (list) => this.projects.set(list),
      error: () => this.projectsDown.set(true),
    });
  }

  // ---- composer inline ----------------------------------------------------------
  protected openComposer() {
    const f = this.filter();
    this.draft = this.blankDraft();
    if (f.startsWith('who:')) this.draft.responsible_id = Number(f.slice(4));
    if (f.startsWith('project:')) this.draft.project_id = Number(f.slice(8));
    if (f === 'today') this.draft.due_date = this.today();
    if (f === 'upcoming') this.draft.due_date = addDays(this.today(), 1);
    this.composerError.set('');
    this.composing.set(true);
    queueMicrotask(() => this.draftTitle()?.nativeElement.focus());
  }

  protected addDraft() {
    const title = this.draft.title.trim();
    if (!title) return;
    const status: TaskStatus = this.filter() === 'in_progress' ? 'in_progress' : 'pending';
    this.composerError.set('');
    this.api
      .create({ ...this.draft, title, status, due_date: this.draft.due_date || null })
      .subscribe({
        next: (saved) => {
          this.tasks.update((list) => [saved, ...list]);
          this.draft = { ...this.draft, title: '', description: '' };
          this.draftTitle()?.nativeElement.focus();
        },
        error: (err: HttpErrorResponse) =>
          this.composerError.set(this.apiMessage(err, 'Não foi possível criar a tarefa. Tente de novo.')),
      });
  }

  // ---- modal (nova / editar) ----------------------------------------------------
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
    const current = this.editing();
    let request;
    if (current) {
      // PATCH só com o que mudou: editar o título não depende dos outros serviços.
      const changes: Record<string, unknown> = {};
      for (const key of Object.keys(input) as (keyof TaskInput)[]) {
        if (input[key] !== current[key]) changes[key] = input[key];
      }
      if (!Object.keys(changes).length) {
        this.formOpen.set(false);
        return;
      }
      request = this.api.update(current.id, changes as Partial<TaskInput>);
    } else {
      request = this.api.create(input);
    }

    this.saving.set(true);
    this.formError.set('');
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
        this.formError.set(this.apiMessage(err, 'Não foi possível salvar. Tente novamente em instantes.'));
      },
    });
  }

  // ---- ações nas tarefas --------------------------------------------------------
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
    return this.visible().filter((t) => t.status === status).sort(byPriorityThenDue);
  }

  // ---- responsáveis e projetos (users-service e projects-service) ---------------
  protected startAdd(kind: 'member' | 'project') {
    this.adding.set(kind);
    this.newName = '';
    queueMicrotask(() => document.getElementById('mini-add')?.focus());
  }

  protected confirmAdd() {
    const name = this.newName.trim();
    const kind = this.adding();
    if (!name || !kind) return;
    const fail = (err: HttpErrorResponse) =>
      this.loadError.set(this.apiMessage(err, 'Não foi possível criar. Tente novamente.'));

    if (kind === 'member') {
      this.membersApi.create({ name }).subscribe({
        next: (m) => this.members.update((l) => [...l, m].sort((a, b) => a.name.localeCompare(b.name))),
        error: fail,
      });
    } else {
      const color = PROJECT_COLORS[this.projects().length % PROJECT_COLORS.length];
      this.projectsApi.create({ name, color }).subscribe({
        next: (p) => this.projects.update((l) => [...l, p].sort((a, b) => a.name.localeCompare(b.name))),
        error: fail,
      });
    }
    this.adding.set(null);
  }

  protected removeMember(member: Member) {
    if (!confirm(`Excluir o responsável "${member.name}"? As tarefas dele ficam sem nome.`)) return;
    this.membersApi.remove(member.id).subscribe({
      next: () => {
        this.members.update((l) => l.filter((m) => m.id !== member.id));
        if (this.filter() === `who:${member.id}`) this.setFilter('all');
        this.load();
      },
      error: (err: HttpErrorResponse) =>
        this.loadError.set(this.apiMessage(err, 'Não foi possível excluir o responsável.')),
    });
  }

  protected removeProject(project: Project) {
    if (!confirm(`Excluir o projeto "${project.name}"? As tarefas dele ficam sem projeto.`)) return;
    this.projectsApi.remove(project.id).subscribe({
      next: () => {
        this.projects.update((l) => l.filter((p) => p.id !== project.id));
        if (this.filter() === `project:${project.id}`) this.setFilter('all');
        this.load();
      },
      error: (err: HttpErrorResponse) =>
        this.loadError.set(this.apiMessage(err, 'Não foi possível excluir o projeto.')),
    });
  }
}
