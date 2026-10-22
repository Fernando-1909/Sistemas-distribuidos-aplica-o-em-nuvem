import { Component, input } from '@angular/core';

export type IconName =
  | 'plus' | 'check' | 'edit' | 'trash' | 'play' | 'search' | 'list' | 'board' | 'menu'
  | 'inbox' | 'circle' | 'progress' | 'done' | 'today' | 'upcoming' | 'calendar' | 'flag'
  | 'sun' | 'moon';

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
        @case ('today') { <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4" /><rect x="8" y="13" width="4" height="3.5" rx="0.8" fill="currentColor" /> }
        @case ('upcoming') { <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4M8 14h8M8 17h5" /> }
        @case ('calendar') { <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4" /> }
        @case ('flag') { <path d="M5 21V4M5 4h12l-2.5 4 2.5 4H5" /> }
        @case ('sun') { <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /> }
        @case ('moon') { <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /> }
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
