import { Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PriorityPicker } from './priority-picker';
import { COLUMNS, Member, Project, Task, TaskInput } from './task.model';

@Component({
  selector: 'app-task-form',
  imports: [FormsModule, PriorityPicker],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
})
export class TaskForm implements OnInit {
  /** Tarefa em edição; vazio = nova tarefa. */
  readonly task = input<Task | null>(null);
  readonly members = input<Member[]>([]);
  readonly projects = input<Project[]>([]);
  readonly saving = input(false);
  readonly error = input('');

  readonly save = output<TaskInput>();
  readonly cancel = output<void>();

  protected readonly statuses = COLUMNS;
  protected readonly touched = signal(false);

  protected model: TaskInput = {
    title: '',
    description: '',
    status: 'pending',
    priority: 4,
    due_date: null,
    responsible_id: null,
    project_id: null,
  };

  ngOnInit() {
    const t = this.task();
    if (t) {
      this.model = {
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        responsible_id: t.responsible_id,
        project_id: t.project_id,
      };
    }
  }

  protected submit() {
    this.touched.set(true);
    if (!this.model.title.trim()) return;
    this.save.emit({
      ...this.model,
      title: this.model.title.trim(),
      due_date: this.model.due_date || null,
    });
  }
}
