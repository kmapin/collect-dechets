import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

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
  resetToken = '';
  resetForm: FormGroup;
  formSubmitted = false;


  passwordsMatchValidator(form: FormGroup) {
    const password = form.get('newPassword')?.value;
    const confirm = form.get('confirmNewPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.forgotForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
    this.resetForm = this.formBuilder.group({
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        this.strongPasswordValidator
      ]],
      confirmNewPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordsMatchValidator
    });


  }



  // ----------------------------------------- Suivre la saisie du user 
  onOtpInput(event: any, index: number): void {
    const input = event.target;
    let value = input.value;
    if (!/^\d$/.test(value)) {
      input.value = '';
      this.otp[index] = '';
      return;
    }
    this.otp[index] = value;
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


  strongPasswordValidator(control: any) {
    const value = control.value;
    if (!value) return null;
    const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    return strongPasswordPattern.test(value) ? null : { weakPassword: true };
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

  goLoginPage() {
    console.log('Redirection vers /login');
    this.router.navigate(['/login']);
  }



  // -------------------------------- Pour l'envoie du code otp sur l'email du user

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


  // -------------------------------- Pour la vérification du code otp recu par email lors de la saisie du user

  verifyOtpCode() {
    const code = this.otp.join('');
    if (code.length !== 6 || /[^0-9]/.test(code)) {
      this.errorMessage = 'Veuillez entrer un code à 6 chiffres.';
      return;
    }
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';
    const email = this.forgotForm.value.email;
    this.authService.verifyCode$(email, code).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.successMessage = res.message || 'Code vérifié';
          this.resetToken = res.resetToken ?? '';
          this.goToResetPage();
        } else {
          this.errorMessage = res.error || 'Code incorrect';
        }
      },
      error: (err) => {
        this.errorMessage = err?.error || 'Erreur lors de la vérification';
        this.loading = false;
      }
    });
  }

  // -------------------------------- Pour la demande d'un nouveau code otp
  resendCode() {
    const email = this.forgotForm.value.email;
    this.loading = true;
    this.authService.forgotPassword$(email).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Code renvoyé';
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error || 'Erreur lors de l’envoi';
        this.loading = false;
      }
    });
  }


  // -------------------------------- Pour le nouveau mot de passe
  submitNewPassword() {
    this.formSubmitted = true;
    this.errorMessage = '';
    this.successMessage = '';
    if (this.resetForm.invalid) {
      this.errorMessage = 'Veuillez remplir correctement les champs.';
      return;
    }
    const newPassword = this.resetForm.value.newPassword;
    const confirmNewPassword = this.resetForm.value.confirmNewPassword;
    this.loading = true;
    this.authService.newPassword$(newPassword, confirmNewPassword, this.resetToken).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success === true) {
          this.successMessage = res.message || 'Mot de passe changé avec succès.';
          this.resetForm.reset();
          this.goLoginPage();
        } else {
          this.errorMessage = res.error || 'Erreur lors de la réinitialisation.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.error || 'Erreur lors de la réinitialisation.';
      }
    });
  }

}
