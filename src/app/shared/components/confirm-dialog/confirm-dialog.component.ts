import { Component, inject } from '@angular/core';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  readonly dialog = inject(ConfirmDialogService);

  confirmar(): void {
    this.dialog.respond(true);
  }

  cancelar(): void {
    this.dialog.respond(false);
  }
}
