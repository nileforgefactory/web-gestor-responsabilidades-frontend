/** Raw response types from the FastAPI backend — only used inside API services. */

export interface ApiSectorOut {
  id: number;
  sector: string;
  icono: string | null;
  cobertura_pct: number;
}

export interface ApiActorOut {
  id: number;
  nombre: string;
  tipo: 'principal' | 'concurrente' | 'subsidiario' | 'otro';
  icono: string | null;
  resp_count: number;
  badge_label: string | null;
  badge_variant: string;
  destacado: boolean;
}

export interface ApiResponsabilidadOut {
  id: number;
  titulo: string;
  descripcion: string | null;
  sector: string | null;
  tipo: 'P' | 'C' | 'S' | 'N';
  referencia_legal: string | null;
  icono: string;
}

export interface ApiBrechaOut {
  id: number;
  titulo: string;
  descripcion: string | null;
  tipo: 'critica' | 'duplicidad' | 'indefinido' | 'sin_responsable';
  severidad: 'alta' | 'media' | 'baja';
  referencia_legal: string | null;
  icono: string;
}

export interface ApiMatrizOut {
  id: number;
  competencia: string;
  ley_base: string | null;
  nacion: 'P' | 'C' | 'S' | 'N';
  departamento: 'P' | 'C' | 'S' | 'N';
  municipio: 'P' | 'C' | 'S' | 'N';
  especializado: 'P' | 'C' | 'S' | 'N';
  brecha: 'ok' | 'critica' | 'duplicidad' | 'indefinido';
}

export interface ApiNormaOut {
  id: number;
  norma_codigo: string | null;
  titulo: string;
  articulos: string | null;
  extracto: string | null;
  tipo: 'ley' | 'decreto' | 'resolucion' | 'circular' | 'otro';
  vigente: boolean;
  advertencia: string | null;
  relevancia: number;
}

export interface ApiPlanSummary {
  id: string;
  titulo: string;
  nombre_corto: string | null;
  entidad: string | null;
  entidad_icono: string;
  nivel: string;
  periodo: string | null;
  estado: string;
  resp_total: number;
  leyes_total: number;
  actores_total: number;
  brechas_total: number;
  avance_pct: number;
  creado_en: string;
  actualizado_en: string;
  sectores: ApiSectorOut[];
}

export interface ApiPlanDetail extends ApiPlanSummary {
  descripcion: string | null;
  archivo_nombre: string | null;
  qdrant_doc_id: string | null;
  actores: ApiActorOut[];
  responsabilidades: ApiResponsabilidadOut[];
  brechas: ApiBrechaOut[];
  matriz: ApiMatrizOut[];
  normas: ApiNormaOut[];
}

export interface ApiPlanCreate {
  titulo: string;
  nombre_corto?: string;
  entidad?: string;
  entidad_icono?: string;
  nivel: string;
  periodo?: string;
  estado?: string;
  descripcion?: string;
  archivo_nombre?: string;
  qdrant_doc_id?: string;
  resp_total?: number;
  leyes_total?: number;
  actores_total?: number;
  brechas_total?: number;
  avance_pct?: number;
  sectores?: { sector: string; icono?: string; cobertura_pct?: number }[];
  actores?: {
    nombre: string; tipo?: string; icono?: string;
    resp_count?: number; badge_label?: string; badge_variant?: string; destacado?: boolean;
  }[];
  responsabilidades?: {
    titulo: string; descripcion?: string; sector?: string;
    tipo?: string; referencia_legal?: string; icono?: string;
  }[];
  brechas?: {
    titulo: string; descripcion?: string; tipo?: string;
    severidad?: string; referencia_legal?: string; icono?: string;
  }[];
  matriz?: {
    competencia: string; ley_base?: string;
    nacion?: string; departamento?: string; municipio?: string; especializado?: string; brecha?: string;
  }[];
  normas?: {
    titulo: string; norma_codigo?: string; articulos?: string; extracto?: string;
    tipo?: string; vigente?: boolean; advertencia?: string; relevancia?: number;
  }[];
}

// ── RAG ──────────────────────────────────────────────────────────────────

export interface ApiRagChunk {
  chunk_id: string;
  document_id: string;
  collection_id: string;
  score: number;
  text: string;
  title: string | null;
  source_filename: string | null;
}

export interface ApiSearchResponse {
  query: string;
  chunks: ApiRagChunk[];
}

export interface ApiRagCitation {
  chunk_id: string;
  document_id: string;
  collection_id: string;
  score: number;
  title: string | null;
  source_filename: string | null;
}

export interface ApiAskResponse {
  answer: string;
  citations: ApiRagCitation[];
  confidence: number;
  used_chunks: string[];
  retrieval_empty: boolean;
}

export interface ApiIngestResponse {
  collection_id: string;
  document_id: string;
  chunks_indexed: number;
}

// ── Conocimiento ─────────────────────────────────────────────────────────

export interface ApiConocimientoOut {
  id: string;
  nombre: string;
  tipo: string;
  coleccion_id: string;
  descripcion: string | null;
  archivo_nombre: string | null;
  archivo_tamano: number | null;
  qdrant_doc_id: string | null;
  chunk_count: number;
  estado: string;
  error_mensaje: string | null;
  creado_en: string;
}

export interface ApiConocimientoCreate {
  nombre: string;
  tipo?: string;
  coleccion_id?: string;
  descripcion?: string;
  archivo_nombre?: string;
  archivo_tamano?: number;
  qdrant_doc_id?: string;
  chunk_count?: number;
  estado?: string;
}

export interface ApiConocimientoUpdate {
  estado?: string;
  chunk_count?: number;
  qdrant_doc_id?: string;
  error_mensaje?: string;
}
