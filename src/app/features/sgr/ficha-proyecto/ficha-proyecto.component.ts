import { Component, OnInit, computed, inject, signal, input, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faDownload, faCheck, faComment, faRotate, faXmark, faBars, faPenToSquare, faFloppyDisk, faArrowLeft, faPlus, faChevronDown, faTrashCan, faTriangleExclamation, faListCheck } from '@fortawesome/free-solid-svg-icons';
import { SgrApiService } from '../../../core/services/sgr-api.service';
import { FichaMGAOut, SesionChatOut, CoberturaPregunta, ItemVerificacionOut, ChecklistItemResultado } from '../../../core/models/sgr.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type SeccionKey = 'identificacion' | 'preparacion' | 'evaluacion' | 'programacion';

const MODULO_LABEL: Record<number, string> = {
  1: 'Identificación',
  2: 'Preparación',
  3: 'Evaluación',
  4: 'Programación',
};

const CHECKLIST_MODULO_LABEL: Record<string, string> = {
  M1: 'Módulo 1 — Identificación',
  M2: 'Módulo 2 — Preparación',
  M3: 'Módulo 3 — Evaluación',
  M4: 'Módulo 4 — Programación',
  PR: 'Presentación',
};

interface GrupoCobertura {
  modulo: number;
  label: string;
  preguntas: CoberturaPregunta[];
}

interface ChecklistItemVista extends ItemVerificacionOut {
  resultado: ChecklistItemResultado | null;
}

interface GrupoChecklist {
  modulo: string;
  label: string;
  items: ChecklistItemVista[];
}

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
  private router    = inject(Router);
  private fb        = inject(FormBuilder);

  readonly faDownload = faDownload;
  readonly faArrowLeft = faArrowLeft;
  readonly faCheck = faCheck;
  readonly faComment = faComment;
  readonly faRotate = faRotate;
  readonly faXmark = faXmark;
  readonly faBars = faBars;
  readonly faPenToSquare = faPenToSquare;
  readonly faFloppyDisk = faFloppyDisk;
  readonly faPlus = faPlus;
  readonly faChevronDown = faChevronDown;
  readonly faTrashCan = faTrashCan;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faListCheck = faListCheck;

  proyectoId = input.required<string>();

  loading   = signal(false);
  errorMsg  = signal<string | null>(null);
  ficha     = signal<FichaMGAOut | null>(null);
  tabActiva = signal<SeccionKey>('identificacion');
  proyectoNombre = signal<string | null>(null);
  proyectoGuardado = signal(false);
  guardandoProyecto = signal(false);
  eliminandoProyecto = signal(false);

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

  // Chat con IA — historial por sesiones (hilos)
  chatMensaje  = signal('');
  chatEnviando = signal(false);
  sesiones        = signal<SesionChatOut[]>([]);
  sesionActivaId  = signal<string | null>(null);
  menuSesiones    = signal(false);

  readonly sesionActiva = computed(() =>
    this.sesiones().find(s => s.id === this.sesionActivaId()) ?? null,
  );
  readonly mensajesActivos = computed(() => this.sesionActiva()?.mensajes ?? []);

  // Exportar Word
  exportandoDocx = signal(false);

  // Cobertura del instrumento MGA (50 preguntas DNP)
  coberturaAbierta = signal(false);

  readonly coberturaPreguntas = computed(() => this.ficha()?.cobertura_preguntas ?? []);
  readonly coberturaResumen = computed(() => {
    const preguntas = this.coberturaPreguntas();
    return {
      total: preguntas.length,
      respondidas: preguntas.filter(p => p.estado === 'respondida').length,
      parciales: preguntas.filter(p => p.estado === 'parcial').length,
      sinResponder: preguntas.filter(p => p.estado === 'no_respondida').length,
    };
  });
  readonly coberturaTieneBrechas = computed(() =>
    this.coberturaResumen().parciales > 0 || this.coberturaResumen().sinResponder > 0,
  );
  /** Las 46 preguntas guía completas (todas, no solo las pendientes), agrupadas por módulo. */
  readonly coberturaGrupos = computed<GrupoCobertura[]>(() => {
    const todas = this.coberturaPreguntas();
    const porModulo = new Map<number, CoberturaPregunta[]>();
    for (const p of todas) {
      if (!porModulo.has(p.modulo)) porModulo.set(p.modulo, []);
      porModulo.get(p.modulo)!.push(p);
    }
    return [...porModulo.entries()]
      .sort(([a], [b]) => a - b)
      .map(([modulo, preguntas]) => ({
        modulo,
        label: MODULO_LABEL[modulo] ?? `Módulo ${modulo}`,
        preguntas: [...preguntas].sort((a, b) => a.numero - b.numero),
      }));
  });

  // Checklist final de verificación (instrumento MGA) — evaluación automática vs. la ficha
  checklistAbierto = signal(false);
  checklistCargando = signal(false);
  checklistError = signal<string | null>(null);
  checklistItems = signal<ItemVerificacionOut[] | null>(null);
  // Ítems no evaluables por IA (soportes físicos, revisión por un par) se marcan manualmente.
  checklistRevisados = signal<Set<string>>(new Set());

  readonly checklistResultadoPorNumero = computed(() => {
    const mapa = new Map<number, ChecklistItemResultado>();
    for (const r of this.ficha()?.checklist_verificacion ?? []) mapa.set(r.numero, r);
    return mapa;
  });

  readonly checklistGrupos = computed<GrupoChecklist[]>(() => {
    const items = this.checklistItems() ?? [];
    const resultados = this.checklistResultadoPorNumero();
    const vista: ChecklistItemVista[] = items.map(it => ({ ...it, resultado: resultados.get(it.numero) ?? null }));
    const porModulo = new Map<string, ChecklistItemVista[]>();
    for (const it of vista) {
      if (!porModulo.has(it.modulo)) porModulo.set(it.modulo, []);
      porModulo.get(it.modulo)!.push(it);
    }
    return [...porModulo.entries()].map(([modulo, items]) => ({
      modulo,
      label: CHECKLIST_MODULO_LABEL[modulo] ?? modulo,
      items,
    }));
  });

  readonly checklistProgreso = computed(() => {
    const items = this.checklistItems() ?? [];
    const resultados = this.checklistResultadoPorNumero();
    const cumplidos = items.filter(it => resultados.get(it.numero)?.cumple === true || this.checklistRevisados().has(it.item)).length;
    return { total: items.length, cumplidos };
  });

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
    this.sgr.detalleProyecto(this.proyectoId()).subscribe({
      next: p => {
        this.proyectoNombre.set(p.nombre);
        this.proyectoGuardado.set(!!p.guardado_en);
      },
      error: () => {},
    });
  }

  // ── Sesiones (hilos) de chat ────────────────────────────────────────────────
  cargarSesiones(): void {
    this.sgr.listarChatSesiones(this.proyectoId()).subscribe({
      next: res => {
        this.sesiones.set(res.sesiones);
        // Conserva la sesión que el usuario esté viendo; si no, usa la activa.
        const actual = this.sesionActivaId();
        const sigueExistiendo = actual && res.sesiones.some(s => s.id === actual);
        this.sesionActivaId.set(sigueExistiendo ? actual : res.activa);
      },
      error: () => {},
    });
  }

  seleccionarSesion(id: string): void {
    this.sesionActivaId.set(id);
    this.menuSesiones.set(false);
  }

  toggleMenuSesiones(): void {
    this.menuSesiones.update(v => !v);
  }

  nuevaSesion(): void {
    this.menuSesiones.set(false);
    this.sgr.crearChatSesion(this.proyectoId()).subscribe({
      next: res => {
        this.sesiones.set(res.sesiones);
        this.sesionActivaId.set(res.activa);
      },
      error: err => this.errorMsg.set(err.error?.detail ?? 'No se pudo crear la conversación'),
    });
  }

  formatoFechaSesion(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  guardarProyecto(): void {
    if (this.guardandoProyecto() || this.proyectoGuardado()) return;
    this.guardandoProyecto.set(true);
    this.sgr.guardarProyecto(this.proyectoId()).subscribe({
      next: () => {
        this.proyectoGuardado.set(true);
        this.guardandoProyecto.set(false);
      },
      error: err => {
        this.errorMsg.set(err.error?.detail ?? 'Error al guardar el proyecto');
        this.guardandoProyecto.set(false);
      },
    });
  }

  volver(): void {
    this.location.back();
  }

  eliminarProyecto(): void {
    if (this.eliminandoProyecto()) return;
    const nombre = this.proyectoNombre() ?? 'este proyecto';
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;

    this.eliminandoProyecto.set(true);
    this.sgr.eliminarProyecto(this.proyectoId()).subscribe({
      next: () => this.router.navigate(['/sgr/mis-proyectos']),
      error: err => {
        this.errorMsg.set(err.error?.detail ?? 'No se pudo eliminar el proyecto');
        this.eliminandoProyecto.set(false);
      },
    });
  }

  cargarFicha(forzar: boolean): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.sgr.generarFichaMGA(this.proyectoId(), { forzar_regeneracion: forzar }).subscribe({
      next: f => { this.ficha.set(f); this.loading.set(false); this.cargarSesiones(); },
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
    this.sgr.chatFichaMGA(this.proyectoId(), mensaje, this.sesionActivaId() ?? undefined).subscribe({
      next: resultado => {
        this.ficha.set(resultado.ficha);
        this.chatMensaje.set('');
        this.chatEnviando.set(false);
        // Resincroniza los hilos (mensajes + título autogenerado de la sesión).
        this.cargarSesiones();
      },
      error: err => {
        this.errorMsg.set(err.error?.detail ?? 'Error al procesar el mensaje de chat');
        this.chatEnviando.set(false);
      },
    });
  }

  toggleCobertura(): void {
    this.coberturaAbierta.update(v => !v);
  }

  private get checklistStorageKey(): string {
    return `sgr_checklist_revisados_${this.proyectoId()}`;
  }

  abrirChecklist(): void {
    this.checklistAbierto.set(true);
    this.cargarChecklistRevisados();
    if (this.checklistItems() || this.checklistCargando()) return;
    this.checklistCargando.set(true);
    this.checklistError.set(null);
    this.sgr.getInstrumentoMga().subscribe({
      next: res => {
        this.checklistItems.set(res.checklist);
        this.checklistCargando.set(false);
      },
      error: err => {
        this.checklistError.set(err.error?.detail ?? 'No se pudo cargar el checklist de verificación');
        this.checklistCargando.set(false);
      },
    });
  }

  cerrarChecklist(): void {
    this.checklistAbierto.set(false);
  }

  private cargarChecklistRevisados(): void {
    try {
      const raw = localStorage.getItem(this.checklistStorageKey);
      this.checklistRevisados.set(new Set(raw ? JSON.parse(raw) : []));
    } catch {
      this.checklistRevisados.set(new Set());
    }
  }

  toggleChecklistItem(item: string): void {
    const revisados = new Set(this.checklistRevisados());
    if (revisados.has(item)) {
      revisados.delete(item);
    } else {
      revisados.add(item);
    }
    this.checklistRevisados.set(revisados);
    try {
      localStorage.setItem(this.checklistStorageKey, JSON.stringify([...revisados]));
    } catch {
      // almacenamiento no disponible: el check no persiste, pero la sesión actual funciona igual
    }
  }

  descargarDocx(): void {
    if (this.exportandoDocx()) return;
    this.exportandoDocx.set(true);
    this.sgr.exportarFichaMGADocx(this.proyectoId()).subscribe({
      next: blob => {
        const base = this.proyectoNombre() ?? this.proyectoId();
        const slug = base.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || this.proyectoId();
        const filename = `ficha_mga_${slug}.docx`;
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
