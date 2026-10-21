import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { COLUMNS, Task, TaskInput } from './task.model';

@Component({
  selector: 'app-task-form',
  imports: [FormsModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
})
export class TaskForm {
  /** Tarefa em edição; vazio = nova tarefa. */
  readonly task = input<Task | null>(null);
  readonly saving = input(false);
  readonly error = input('');

  readonly save = output<TaskInput>();
  readonly cancel = output<void>();

  protected readonly statuses = COLUMNS;
  protected readonly touched = signal(false);

  protected model: TaskInput = { title: '', description: '', responsible: '', status: 'pending' };

  ngOnInit() {
    const t = this.task();
    if (t) {
      this.model = {
        title: t.title,
        description: t.description,
        responsible: t.responsible,
        status: t.status,
      };
    }
  }

  protected submit() {
    this.touched.set(true);
    if (!this.model.title.trim()) return;
    this.save.emit({ ...this.model, title: this.model.title.trim() });
  }
}
