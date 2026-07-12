// Modelos de dominio SGR — Caja de Herramientas Cat. 5 y 6

export type EstadoOnboarding =
  | 'credenciales_provisionales'
  | 'contrasena_cambiada'
  | 'plan_cargando'
  | 'plan_analizado';

export interface OnboardingStatus {
  estado: EstadoOnboarding;
  password_provisional: boolean;
  divipola: string | null;
  categoria_municipio: string | null;
  nbi: number | null;
  icld: number | null;
  acceso_completo: boolean;
}

export interface ChangePasswordRequest {
  password_actual: string;
  password_nuevo: string;
  password_confirmar: string;
}

// ── Proyectos SGR ──────────────────────────────────────────────────────────────

export type Semaforo = 'verde' | 'amarillo' | 'rojo';
export type ModeSGR  = 'descubrimiento' | 'evaluacion_inversa';
export type EstadoProyecto =
  | 'borrador' | 'diagnosticado' | 'pendiente_plan' | 'en_plan'
  | 'pre_validado' | 'listo_dnp' | 'enviado_dnp' | 'aprobado' | 'rechazado';

export interface ProyectoCandidato {
  id: string | null;
  brecha_id: number;
  brecha_titulo: string;
  brecha_severidad: string;
  nombre: string;
  sector_sgr: string;
  subsector: string | null;
  tipo_inversion: string;
  fuente_recomendada: string;
  fuente_label: string;
  razon_elegibilidad: string;
  condiciones: string[];
  score_sgr: number;
  score_severidad: number;
  score_alineacion: number;
  score_elegibilidad: number;
  score_viabilidad: number;
  semaforo: Semaforo;
  semaforo_label: string;
  estado: EstadoProyecto;
  modo: ModeSGR;
  guardado: boolean;
  tiene_ficha_mga: boolean;
}

export interface EvaluarPlanResponse {
  plan_id: string;
  municipio_codigo: string | null;
  categoria_municipio: string | null;
  total_brechas: number;
  total_elegibles: number;
  total_no_elegibles: number;
  proyectos_candidatos: ProyectoCandidato[];
  advertencias: string[];
  procesado_en: string;
}

export interface ProyectoSGROut {
  id: string;
  plan_id: string;
  brecha_id: number | null;
  municipio_codigo: string;
  nombre: string;
  sector_sgr: string;
  subsector_sgr: string | null;
  tipo_inversion: string | null;
  fuente_sgr: string | null;
  score_sgr: number | null;
  elegible: boolean | null;
  razon_elegibilidad: string | null;
  cuadrante: string | null;
  en_plan: boolean | null;
  estado: EstadoProyecto;
  modo: ModeSGR;
  creado_en: string;
  actualizado_en: string;
  guardado_en: string | null;
  resultado_duplicidad: Record<string, unknown> | null;
  diagnostico_mga: Record<string, unknown> | null;
}

export interface ProyectoGuardadoOut extends ProyectoSGROut {
  plan_titulo: string;
  plan_nombre_corto: string | null;
  tiene_ficha_mga: boolean;
}

// ── Ficha MGA ─────────────────────────────────────────────────────────────────

export interface FichaMGAOut {
  id: number;
  proyecto_id: string;
  identificacion: string | null;
  preparacion: string | null;
  evaluacion: string | null;
  programacion: string | null;
  campos_completos: number;
  modelo_usado: string | null;
  generado_en: string;
  actualizado_en: string;
  /** Mensajes de la sesión (hilo) activa. */
  chat_historial: ChatMensaje[];
  /** Metadatos de todas las sesiones (hilos) de chat. */
  chat_sesiones: SesionChatMeta[];
  /** Id de la sesión activa. */
  sesion_activa: string | null;
}

export interface GenerarFichaMGARequest {
  forzar_regeneracion?: boolean;
  top_chunks_plan?: number;
}

export interface ChatMensaje {
  role: 'usuario' | 'asistente';
  texto: string;
  timestamp: string;
}

export interface SesionChatMeta {
  id: string;
  titulo: string;
  creada_en: string;
  total_mensajes: number;
}

export interface SesionChatOut {
  id: string;
  titulo: string;
  creada_en: string;
  mensajes: ChatMensaje[];
}

export interface ChatSesionesResponse {
  sesiones: SesionChatOut[];
  activa: string | null;
}

export interface ActualizarFichaMGARequest {
  identificacion?: string;
  preparacion?: string;
  evaluacion?: string;
  programacion?: string;
}

export interface ChatFichaMGARequest {
  mensaje: string;
  sesion_id?: string;
}

export interface ChatFichaMGAResponse {
  respuesta_ia: string;
  ficha: FichaMGAOut;
}

// ── Duplicidad ────────────────────────────────────────────────────────────────

export type NivelDuplicidad = 'ALTO' | 'MEDIO' | 'BAJO';

export interface SimilarRagItem {
  texto: string;
  nombre_proyecto: string;
  codigo_bpin: string | null;
  municipio: string;
  score_qdrant: number;
}

export interface VerificarDuplicidadResponse {
  proyecto_id: string;
  nivel: NivelDuplicidad;
  score_similitud: number;
  proyecto_similar: string | null;
  codigo_bpin: string | null;
  estado_similar: string | null;
  recomendacion: string;
  puede_continuar: boolean;
  bloqueado: boolean;
  similares_rag: SimilarRagItem[];
  verificado_en: string;
}

// ── Modo 2: Evaluación Inversa ────────────────────────────────────────────────

export interface DiagnosticoDimension {
  nombre: string;
  score: number;
  nivel: 'alto' | 'medio' | 'bajo';
  hallazgos: string[];
  recomendaciones: string[];
}

export interface SubflujoInclusion {
  necesita_inclusion: boolean;
  checklist_concejo: string[];
  texto_acuerdo_sugerido: string | null;
}

export interface EvaluarProyectoRequest {
  texto_proyecto: string;
  plan_id?: string | null;
  proyecto_id?: string | null;
  guardar?: boolean;
  top_chunks_plan?: number;
}

export interface EvaluarProyectoResponse {
  estructura_mga: DiagnosticoDimension;
  alineacion_plan: DiagnosticoDimension;
  analisis_estrategico: DiagnosticoDimension;
  calificacion_sgr: DiagnosticoDimension;
  score_total: number;
  cuadrante: 'OPTIMO' | 'BIEN_JUSTIFICADO' | 'ATRACTIVO_CON_RIESGO' | 'REFORMULAR';
  cuadrante_label: string;
  semaforo: Semaforo;
  semaforo_label: string;
  en_plan: boolean;
  evidencia_plan: string;
  subflujo_inclusion: SubflujoInclusion;
  proyecto_id: string | null;
  plan_id: string | null;
  procesado_en: string;
}
