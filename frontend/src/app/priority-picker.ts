import { Component, model } from '@angular/core';

import { Icon } from './icon';
import { Priority } from './task.model';

/** Seletor P1–P4, com a cor de cada prioridade (como no Todoist). */
@Component({
  selector: 'app-priority',
  imports: [Icon],
  template: `
    <div class="pp" role="radiogroup" aria-label="Prioridade">
      @for (p of options; track p) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="value() === p"
          [attr.data-p]="p"
          [class.on]="value() === p"
          [title]="'Prioridade ' + p"
          (click)="value.set(p)"
        >
          <app-icon name="flag" [size]="13" /> P{{ p }}
        </button>
      }
    </div>
  `,
  styles: `
    .pp {
      display: inline-flex;
      gap: 0.25rem;
    }
    button {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      height: 1.9rem;
      padding: 0 0.55rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: transparent;
      color: var(--muted);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover {
      background: var(--hover);
    }
    button[data-p='1'] { --c: var(--p1); }
    button[data-p='2'] { --c: var(--p2); }
    button[data-p='3'] { --c: var(--p3); }
    button[data-p='4'] { --c: var(--muted); }
    button app-icon {
      color: var(--c);
    }
    button.on {
      border-color: var(--c);
      color: var(--text);
      background: color-mix(in srgb, var(--c) 14%, transparent);
    }
  `,
})
export class PriorityPicker {
  readonly value = model<Priority>(4);
  protected readonly options: Priority[] = [1, 2, 3, 4];
}
