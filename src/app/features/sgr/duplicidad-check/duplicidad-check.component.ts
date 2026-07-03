import { Component, OnInit, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SgrApiService } from '../../../core/services/sgr-api.service';
import { VerificarDuplicidadResponse } from '../../../core/models/sgr.model';

@Component({
  selector: 'app-duplicidad-check',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './duplicidad-check.component.html',
  styleUrl: './duplicidad-check.component.css',
})
export class DuplicidadCheckComponent implements OnInit {
  private sgr = inject(SgrApiService);

  proyectoId = input.required<string>();

  loading   = signal(false);
  errorMsg  = signal<string | null>(null);
  resultado = signal<VerificarDuplicidadResponse | null>(null);

  ngOnInit(): void {
    this.verificar();
  }

  verificar(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.sgr.verificarDuplicidad(this.proyectoId()).subscribe({
      next: r => { this.resultado.set(r); this.loading.set(false); },
      error: err => {
        this.errorMsg.set(err.error?.detail ?? 'Error al verificar duplicidad');
        this.loading.set(false);
      },
    });
  }

  nivelClass(nivel: string): string {
    return nivel === 'ALTO' ? 'nivel-alto' : nivel === 'MEDIO' ? 'nivel-medio' : 'nivel-bajo';
  }

  nivelIcon(nivel: string): string {
    return nivel === 'ALTO' ? '🔴' : nivel === 'MEDIO' ? '🟡' : '🟢';
  }
}
