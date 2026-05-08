import type { BadgeVariant } from '../../shared/components/badge/badge.component';

export type NormaType = 'ley' | 'decreto' | 'resolucion' | 'circular' | 'otro';
export type RagState  = 'idle' | 'querying' | 'done';
export type FilterType = 'all' | NormaType;

export interface RagResult {
  id: string;
  type: NormaType;
  typeLabel: string;
  typeBadgeVariant: BadgeVariant;
  title: string;
  articles: string;
  excerpt: string;
  relevance: number; // 0–100
  vigente: boolean;
  updatedWarning?: string;
  applicablePlans?: string[];
  badges: { label: string; variant: BadgeVariant }[];
}

export interface RagSynthesis {
  text: string;
  sourceCount: number;
}

export interface PipelineStep {
  id: string;
  icon: string;
  label: string;
  status: 'done' | 'running' | 'waiting' | 'error';
  detail?: string;
}

export const INITIAL_PIPELINE_STEPS: PipelineStep[] = [
  { id: 'embed',   icon: '🔢', label: 'Vectorización de consulta', status: 'waiting' },
  { id: 'search',  icon: '🔍', label: 'Búsqueda semántica QDRANT', status: 'waiting' },
  { id: 'rank',    icon: '📊', label: 'Re-ranking por relevancia',  status: 'waiting' },
  { id: 'extract', icon: '✂️', label: 'Extracción de fragmentos',   status: 'waiting' },
  { id: 'synth',   icon: '🤖', label: 'Síntesis del agente IA',     status: 'waiting' },
];


export const FILTER_OPTIONS: { type: FilterType; label: string; icon: string }[] = [
  { type: 'all',        label: 'Todos los resultados', icon: '📋' },
  { type: 'ley',        label: 'Leyes',                icon: '⚖️' },
  { type: 'decreto',    label: 'Decretos',             icon: '📜' },
  { type: 'resolucion', label: 'Resoluciones',         icon: '📄' },
  { type: 'circular',   label: 'Circulares',           icon: '🔏' },
];

export const SEARCH_SUGGESTIONS = [
  '¿Cuáles son las responsabilidades del municipio en educación preescolar?',
  '¿Qué dice la ley sobre agua potable rural en municipios?',
  '¿Competencias concurrentes en salud entre nación y municipio?',
  '¿Qué leyes regulan el ordenamiento territorial municipal?',
];

