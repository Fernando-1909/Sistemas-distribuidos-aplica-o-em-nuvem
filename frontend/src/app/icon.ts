import { Component, input } from '@angular/core';

export type IconName =
  | 'plus' | 'check' | 'edit' | 'trash' | 'play' | 'search' | 'list' | 'board'
  | 'menu' | 'inbox' | 'circle' | 'progress' | 'done';

/** Ícones de traço simples (24x24), sem dependências externas. */
@Component({
  selector: 'app-icon',
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('plus') { <path d="M12 5v14M5 12h14" /> }
        @case ('check') { <path d="M20 6 9 17l-5-5" /> }
        @case ('edit') { <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /> }
        @case ('trash') { <path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /> }
        @case ('play') { <path d="M7 4.5v15l12-7.5Z" /> }
        @case ('search') { <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /> }
        @case ('list') { <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /> }
        @case ('board') { <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18" /> }
        @case ('menu') { <path d="M4 6h16M4 12h16M4 18h16" /> }
        @case ('inbox') { <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1Z" /> }
        @case ('circle') { <circle cx="12" cy="12" r="8.5" /> }
        @case ('progress') { <circle cx="12" cy="12" r="8.5" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" /> }
        @case ('done') { <circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.3 2.5 2.5 4.5-5" /> }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    svg {
      display: block;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(16);
}
