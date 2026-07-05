import { Component, OnInit, inject, signal, input, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faDownload, faCheck, faComment, faRotate, faXmark, faBars, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { SgrApiService } from '../../../core/services/sgr-api.service';
import { FichaMGAOut } from '../../../core/models/sgr.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type SeccionKey = 'identificacion' | 'preparacion' | 'evaluacion' | 'programacion';

@Component({
  selector: 'app-ficha-proyecto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent, IconComponent],
  templateUrl: './ficha-proyecto.component.html',
  styleUrl: './ficha-proyecto.component.css',
})
export class FichaProyectoComponent implements OnInit {
  private sgr      = inject(SgrApiService);
  private location = inject(Location);
  private fb        = inject(FormBuilder);

  readonly faDownload = faDownload;
  readonly faCheck = faCheck;
  readonly faComment = faComment;
  readonly faRotate = faRotate;
  readonly faXmark = faXmark;
  readonly faBars = faBars;
  readonly faPenToSquare = faPenToSquare;

  proyectoId = input.required<string>();

  loading   = signal(false);
  errorMsg  = signal<string | null>(null);
  ficha     = signal<FichaMGAOut | null>(null);
  tabActiva = signal<SeccionKey>('identificacion');

  // --- UI-only state (rediseño visual, sin lógica de negocio) ---
  modoEdicion   = signal<SeccionKey | null>(null);
  chatColapsado = signal(false);

  // Edición manual de secciones
  form = this.fb.group({
    identificacion: [''],
    preparacion: [''],
    evaluacion: [''],
    programacion: [''],
  });

  guardando = signal<SeccionKey | null>(null);
  guardadoOk = signal<SeccionKey | null>(null);

  // Chat con IA
  chatMensaje  = signal('');
  chatEnviando = signal(false);

  // Exportar Word
  exportandoDocx = signal(false);

  constructor() {
    effect(() => {
      const f = this.ficha();
      if (!f) return;
      this.form.patchValue({
        identificacion: f.identificacion ?? '',
        preparacion: f.preparacion ?? '',
        evaluacion: f.evaluacion ?? '',
        programacion: f.programacion ?? '',
      }, { emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.cargarFicha(false);
  }

  volver(): void {
    this.location.back();
  }

  cargarFicha(forzar: boolean): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.sgr.generarFichaMGA(this.proyectoId(), { forzar_regeneracion: forzar }).subscribe({
      next: f => { this.ficha.set(f); this.loading.set(false); },
      error: err => {
        this.errorMsg.set(err.error?.detail ?? 'Error al generar la Ficha MGA');
        this.loading.set(false);
      },
    });
  }

  copiarSeccion(texto: string | null): void {
    if (texto) navigator.clipboard.writeText(texto).catch(() => {});
  }

  readonly secciones = [
    { key: 'identificacion' as const, label: 'Identificación', icon: '🔍', num: '1' },
    { key: 'preparacion'   as const, label: 'Preparación',    icon: '📐', num: '2' },
    { key: 'evaluacion'    as const, label: 'Evaluación',     icon: '📊', num: '3' },
    { key: 'programacion'  as const, label: 'Programación',   icon: '📅', num: '4' },
  ];

  getSeccion(key: string): string | null {
    const f = this.ficha();
    if (!f) return null;
    return (f as any)[key] ?? null;
  }

  toggleEdicion(key: SeccionKey): void {
    this.modoEdicion.set(this.modoEdicion() === key ? null : key);
  }

  toggleChatMobile(): void {
    this.chatColapsado.update(v => !v);
  }

  irASeccion(key: SeccionKey): void {
    this.tabActiva.set(key);
    document.getElementById('seccion-' + key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  completadoClass(): string {
    const c = this.ficha()?.campos_completos ?? 0;
    if (c === 4) return 'completo';
    if (c >= 2)  return 'parcial';
    return 'minimo';
  }

  guardarSeccion(campo: SeccionKey): void {
    if (this.guardando()) return;
    const valor = this.form.get(campo)?.value ?? '';
    this.guardando.set(campo);
    this.guardadoOk.set(null);

    this.sgr.actualizarFichaMGA(this.proyectoId(), { [campo]: valor }).subscribe({
      next: resultado => {
        this.ficha.set(resultado);
        this.guardando.set(null);
        this.guardadoOk.set(campo);
        this.modoEdicion.set(null);
        setTimeout(() => {
          if (this.guardadoOk() === campo) this.guardadoOk.set(null);
        }, 2500);
      },
      error: err => {
        this.errorMsg.set(err.error?.detail ?? 'Error al guardar la sección');
        this.guardando.set(null);
      },
    });
  }

  enviarChat(): void {
    const mensaje = this.chatMensaje().trim();
    if (!mensaje || this.chatEnviando()) return;

    this.chatEnviando.set(true);
    this.sgr.chatFichaMGA(this.proyectoId(), mensaje).subscribe({
      next: resultado => {
        this.ficha.set(resultado.ficha);
        this.chatMensaje.set('');
        this.chatEnviando.set(false);
      },
      error: err => {
        this.errorMsg.set(err.error?.detail ?? 'Error al procesar el mensaje de chat');
        this.chatEnviando.set(false);
      },
    });
  }

  descargarDocx(): void {
    if (this.exportandoDocx()) return;
    this.exportandoDocx.set(true);
    this.sgr.exportarFichaMGADocx(this.proyectoId()).subscribe({
      next: blob => {
        const filename = `ficha_mga_${this.proyectoId()}.docx`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        this.exportandoDocx.set(false);
      },
      error: err => {
        this.errorMsg.set(err.error?.detail ?? 'Error al descargar el documento Word');
        this.exportandoDocx.set(false);
      },
    });
  }
}
