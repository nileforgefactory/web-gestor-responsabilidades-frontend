import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faScaleBalanced, faEye, faEyeSlash, faLock, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private fb     = inject(FormBuilder);

  readonly faScaleBalanced = faScaleBalanced;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
  readonly faLock = faLock;
  readonly faTriangleExclamation = faTriangleExclamation;

  loading      = signal(false);
  errorMsg     = signal<string | null>(null);
  showPassword = signal(false);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  togglePassword(): void { this.showPassword.update(v => !v); }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    const { email, password } = this.form.value;
    if (!email || !password) return;

    this.loading.set(true);
    this.errorMsg.set(null);

    this.auth.login({ email, password }).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (err: Error) => {
        this.errorMsg.set(err.message ?? 'Credenciales incorrectas.');
        this.loading.set(false);
      },
    });
  }
}
