import { Component, ElementRef, ViewChild, effect, input } from '@angular/core';

export type LogType = 'ok' | 'info' | 'warn' | 'proc' | 'error';

export interface LogLine {
  time: string;
  type: LogType;
  message: string;
}

@Component({
  selector: 'app-agent-log',
  standalone: true,
  templateUrl: './agent-log.component.html',
  styleUrl: './agent-log.component.css',
})
export class AgentLogComponent {
  logs = input<LogLine[]>([]);
  height = input<string>('240px');

  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  constructor() {
    effect(() => {
      // Track log changes and scroll to bottom
      this.logs();
      setTimeout(() => {
        if (this.container) {
          this.container.nativeElement.scrollTop = this.container.nativeElement.scrollHeight;
        }
      }, 30);
    });
  }
}
