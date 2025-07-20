import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPassword {

  forgotForm: FormGroup;

  successMessage = '';
  errorMessage = '';
  loading = false;
  currentPage: 'forgot' | 'code' | 'reset' = 'forgot';

  otp: string[] = ['', '', '', '', '', ''];
  otpArray = Array(6).fill(0);



  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService
  ) {
    this.forgotForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }



  onOtpInput(event: any, index: number): void {
    const input = event.target;
    const value = input.value;

    if (value.length === 1 && index < 5) {
      const nextInput = input.nextElementSibling;
      if (nextInput) nextInput.focus();
    }
  }

  onOtpKeyDown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace' && input.value === '' && index > 0) {
      const previousInput = input.previousElementSibling as HTMLInputElement;
      if (previousInput) previousInput.focus();
    }
  }



  // ------------------------ Switcher entre les pages

  goToCodePage() {
    this.currentPage = 'code';
  }

  goToResetPage() {
    this.currentPage = 'reset';
  }

  goToForgotPage() {
    this.currentPage = 'forgot';
  }


  forgotSubmit() {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.forgotForm.invalid) {
      this.errorMessage = 'Veuillez saisir une adresse email valide';
      return;
    }

    this.loading = true;
    const email = this.forgotForm.value.email;

    this.authService.forgotPassword$(email).subscribe({
      next: (res) => {
        this.successMessage = res.message || "Un code de réinitilisation a été envoyé à votre adresse email";
        this.loading = false;
        this.goToCodePage();
      },
      error: (err) => {
        this.errorMessage = err?.error || "Erreur lors de l'envoi du code";
        this.loading = false;
      }
    });
  }



  verifyOtpCode() {
    const code = this.otp.join('').trim();
    const email = this.forgotForm.value.email;

    if (code.length !== 6 || code.includes('')) {
      this.errorMessage = 'Veuillez saisir les 6 chiffres du code reçu';
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.authService.verifyCode$(email, code).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage = res.message || 'Code vérifié';
          this.goToResetPage();
        } else {
          this.errorMessage = res.error || 'Code incorrect';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error || 'Erreur lors de la vérification';
        this.loading = false;
      }
    });
  }


}
