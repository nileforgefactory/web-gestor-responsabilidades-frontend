export type RolCodigo    = 'usuario' | 'administrador' | 'superadmin';
export type RolAsignable = 'usuario' | 'administrador';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface TerritorioOut {
  pais: string;
  departamento: string | null;
  municipio: string | null;
  coleccion_id: string;
}

export interface MeResponse {
  id: string;
  nombre: string;
  email: string;
  rol: RolCodigo;
  territorio: TerritorioOut;
  activo: boolean;
  creado_en: string;
  plan_activo_id: string | null;
}

export interface UserSummary {
  id: string;
  nombre: string;
  email: string;
  rol: RolCodigo;
  territorio: TerritorioOut;
  activo: boolean;
  creado_en: string;
}

export interface UserCreateRequest {
  nombre: string;
  email: string;
  password: string;
  rol: RolAsignable;
  territorio?: (string | null)[];
}

export interface ChangeRolRequest {
  rol: RolAsignable;
}
