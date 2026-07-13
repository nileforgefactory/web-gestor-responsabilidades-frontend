import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faUsers,
  faShieldHalved,
  faUser,
  faKey,
  faMagnifyingGlass,
  faXmark,
  faTriangleExclamation,
  faRotate,
  faPlus,
  faArrowLeft,
  faArrowUp,
  faArrowDown,
  faTrash,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../core/services/auth.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { RolAsignable, RolCodigo, UserSummary } from '../../core/models/auth.model';
import {
  SidebarComponent,
  SidebarItem,
  SidebarSection,
  SidebarUser,
} from '../../shared/components/sidebar/sidebar.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';

const ROL_LABEL: Record<RolCodigo, string> = {
  superadmin:    'Super Admin',
  administrador: 'Administrador',
  usuario:       'Usuario',
};

const ROL_BADGE: Record<RolCodigo, BadgeVariant> = {
  superadmin:    'purple',
  administrador: 'blue',
  usuario:       'green',
};

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [SidebarComponent, BadgeComponent, ReactiveFormsModule, FaIconComponent],
  templateUrl: './admin-usuarios.component.html',
  styleUrl:    './admin-usuarios.component.css',
})
export class AdminUsuariosComponent implements OnInit {
  private api    = inject(UsersApiService);
  readonly auth  = inject(AuthService);
  private router = inject(Router);
  private fb     = inject(FormBuilder);

  readonly faUsers = faUsers;
  readonly faShieldHalved = faShieldHalved;
  readonly faUser = faUser;
  readonly faKey = faKey;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faXmark = faXmark;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faRotate = faRotate;
  readonly faPlus = faPlus;
  readonly faArrowLeft = faArrowLeft;
  readonly faArrowUp = faArrowUp;
  readonly faArrowDown = faArrowDown;
  readonly faTrash = faTrash;
  readonly faSpinner = faSpinner;

  // ── State ──────────────────────────────────────────────────────────────────
  users        = signal<UserSummary[]>([]);
  loading      = signal(true);
  pageError    = signal<string | null>(null);
  search       = signal('');

  // Create modal
  showCreate  = signal(false);
  creating    = signal(false);
  createError = signal<string | null>(null);
  createRole  = signal<RolAsignable>('usuario');

  // Delete confirm
  deleteTarget = signal<UserSummary | null>(null);
  deleting     = signal(false);

  // Role change
  changingId = signal<string | null>(null);

  // ── Create form ────────────────────────────────────────────────────────────
  createForm = this.fb.group({
    nombre:        ['', [Validators.required, Validators.minLength(2)]],
    email:         ['', [Validators.required, Validators.email]],
    password:      ['', [Validators.required, Validators.minLength(6)]],
    pais:          ['COLOMBIA', Validators.required],
    departamento:  [''],
    municipio:     [''],
  });

  // ── Computed ───────────────────────────────────────────────────────────────
  isSuperAdmin = computed(() => this.auth.rol() === 'superadmin');

  filteredUsers = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(u =>
      u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)  ||
      u.territorio.coleccion_id.toLowerCase().includes(q),
    );
  });

  totalCount = computed(() => this.users().length);
  adminCount = computed(() => this.users().filter(u => u.rol === 'administrador').length);
  userCount  = computed(() => this.users().filter(u => u.rol === 'usuario').length);

  sidebarSections = computed<SidebarSection[]>(() => [
    {
      label: 'Administración',
      items: [
        {
          id:     'usuarios',
          icon:   '👥',
          label:  'Usuarios y roles',
          status: 'active',
          badge:  this.totalCount(),
        },
      ],
    },
    {
      label: 'Navegación',
      items: [
        { id: 'volver', icon: '←', label: 'Volver al sistema' },
      ],
    },
  ]);

  sidebarUser = computed<SidebarUser | null>(() => {
    const u = this.auth.user();
    if (!u) return null;
    return {
      initials:    u.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase(),
      avatarColor: '#1A3A6B',
      name:        u.nombre,
      role:        ROL_LABEL[u.rol],
      roleVariant: ROL_BADGE[u.rol],
    };
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void { this.loadUsers(); }

  loadUsers(): void {
    this.loading.set(true);
    this.pageError.set(null);
    this.api.listUsers().subscribe({
      next:  users => { this.users.set(users); this.loading.set(false); },
      error: err   => { this.pageError.set(err.message); this.loading.set(false); },
    });
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  onSidebarClick(item: SidebarItem): void {
    if (item.id === 'volver') this.router.navigate(['/cargar-plan']);
  }

  // ── Create modal ───────────────────────────────────────────────────────────
  openCreate(): void {
    this.createForm.reset({ pais: 'COLOMBIA' });
    this.createRole.set('usuario');
    this.createError.set(null);
    this.showCreate.set(true);
  }

  closeCreate(): void { this.showCreate.set(false); }

  setCreateRole(rol: RolAsignable): void { this.createRole.set(rol); }

  submitCreate(): void {
    if (this.createForm.invalid || this.creating()) return;
    const v = this.createForm.value;

    const territorio: (string | null)[] = [
      v.pais ?? 'COLOMBIA',
      v.departamento?.trim() || null,
      v.municipio?.trim()    || null,
    ];

    this.creating.set(true);
    this.createError.set(null);

    this.api.createUser({
      nombre:    v.nombre!,
      email:     v.email!,
      password:  v.password!,
      rol:       this.createRole(),
      territorio,
    }).subscribe({
      next: user => {
        this.users.update(list => [...list, user]);
        this.creating.set(false);
        this.showCreate.set(false);
      },
      error: err => {
        this.createError.set(err.message);
        this.creating.set(false);
      },
    });
  }

  // ── Role change ────────────────────────────────────────────────────────────
  toggleRol(user: UserSummary): void {
    if (this.changingId()) return;
    const newRol: RolAsignable = user.rol === 'administrador' ? 'usuario' : 'administrador';
    this.changingId.set(user.id);
    this.api.changeRol(user.id, { rol: newRol }).subscribe({
      next: updated => {
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.changingId.set(null);
      },
      error: () => this.changingId.set(null),
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  confirmDelete(user: UserSummary): void { this.deleteTarget.set(user); }
  cancelDelete():  void { this.deleteTarget.set(null); }

  submitDelete(): void {
    const target = this.deleteTarget();
    if (!target || this.deleting()) return;
    this.deleting.set(true);
    this.api.deleteUser(target.id).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.id !== target.id));
        this.deleteTarget.set(null);
        this.deleting.set(false);
      },
      error: () => this.deleting.set(false),
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  rolLabel(rol: RolCodigo):   string      { return ROL_LABEL[rol] ?? rol; }
  rolBadge(rol: RolCodigo):   BadgeVariant { return ROL_BADGE[rol] ?? 'gray'; }
  initials(nombre: string):   string {
    return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  territorioLabel(u: UserSummary): string {
    const t = u.territorio;
    return [t.municipio, t.departamento, t.pais].filter(Boolean).join(', ');
  }
  isSelf(userId: string): boolean { return this.auth.user()?.id === userId; }
}
