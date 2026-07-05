import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { SgrApiService } from '../../../core/services/sgr-api.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const nuevo    = control.get('password_nuevo')?.value;
  const confirmar = control.get('password_confirmar')?.value;
  return nuevo && confirmar && nuevo !== confirmar ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-cambiar-contrasena',
  standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent],
  templateUrl: './cambiar-contrasena.component.html',
  styleUrl: './cambiar-contrasena.component.css',
})
export class CambiarContrasenaComponent {
  private sgr    = inject(SgrApiService);
  private router = inject(Router);
  private fb     = inject(FormBuilder);

  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;

  loading  = signal(false);
  errorMsg = signal<string | null>(null);
  success  = signal(false);

  showActual   = signal(false);
  showNuevo    = signal(false);
  showConfirmar = signal(false);

  form = this.fb.group(
    {
      password_actual:    ['', [Validators.required]],
      password_nuevo:     ['', [Validators.required, Validators.minLength(10),
                                Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/)]],
      password_confirmar: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.sgr.changePassword(this.form.value as any).subscribe({
      next: () => {
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/onboarding/cargar-plan']), 1500);
      },
      error: err => {
        this.errorMsg.set(err.error?.detail ?? 'Error al cambiar la contraseña');
        this.loading.set(false);
      },
    });
  }

  get f() { return this.form.controls; }
}
