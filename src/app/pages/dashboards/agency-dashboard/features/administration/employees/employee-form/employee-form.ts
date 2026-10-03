import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { EmployeeAdministrationService } from '../employee-administration.service';
import { Employee, EMPLOYEE_ROLES } from '../employee.model';
import { NotificationService } from '../../../../../../../services/notification.service';

/** Même validateur que agency-dashboard.ts::passwordMatchValidator (mot de passe requis
 * uniquement à la création — voir toggleValidateursMotDePasse ci-dessous). */
function passwordMatchValidator(): ValidatorFn {
  return (group): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (!password && !confirmPassword) return null;
    return password === confirmPassword ? null : { passwordMismatch: true };
  };
}

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.scss',
})
export class EmployeeForm implements OnChanges {
  /** null = création, sinon édition de cet employé. */
  @Input() employee: Employee | null = null;
  @Output() saved = new EventEmitter<Employee>();
  @Output() cancelled = new EventEmitter<void>();

  readonly roles = EMPLOYEE_ROLES;
  form: FormGroup;
  enregistrementEnCours = false;
  erreurApi = '';

  get estEdition(): boolean {
    return !!this.employee;
  }

  constructor(
    private fb: FormBuilder,
    private employeeAdministrationService: EmployeeAdministrationService,
    private notification: NotificationService,
  ) {
    this.form = this.creerFormulaire();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employee']) {
      this.form = this.creerFormulaire();
      this.erreurApi = '';
    }
  }

  private creerFormulaire(): FormGroup {
    const e = this.employee;
    return this.fb.group(
      {
        firstName: [e?.firstName ?? '', [Validators.required, Validators.minLength(2)]],
        lastName: [e?.lastName ?? '', [Validators.required, Validators.minLength(2)]],
        // Optionnel côté backend (services/employeesAdministration.js) — connexion
        // possible par téléphone seul, même règle que le formulaire employé existant.
        email: [e?.email ?? '', [Validators.email]],
        password: ['', this.estEdition ? [] : [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', this.estEdition ? [] : [Validators.required]],
        phone: [e?.phone ?? '', [Validators.required, Validators.pattern(/^[0-9+\-\s]+$/)]],
        role: [e?.role ?? '', Validators.required],
        address: this.fb.group({
          street: [e?.address?.street ?? ''],
          arrondissement: [e?.address?.arrondissement ?? '', Validators.required],
          sector: [e?.address?.sector ?? '', Validators.required],
          doorNumber: [e?.address?.doorNumber ?? ''],
          doorColor: [e?.address?.doorColor ?? ''],
          neighborhood: [e?.address?.neighborhood ?? '', Validators.required],
          city: [e?.address?.city ?? '', Validators.required],
          postalCode: [e?.address?.postalCode ?? ''],
        }),
      },
      { validators: passwordMatchValidator() },
    );
  }

  champInvalide(nomChamp: string): boolean {
    const champ = this.form.get(nomChamp);
    return !!champ && champ.invalid && (champ.dirty || champ.touched);
  }

  champAdresseInvalide(nomChamp: string): boolean {
    const champ = this.form.get('address')?.get(nomChamp);
    return !!champ && champ.invalid && (champ.dirty || champ.touched);
  }

  annuler(): void {
    this.cancelled.emit();
  }

  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.erreurApi = '';
    this.enregistrementEnCours = true;
    const valeurs = this.form.value;

    const requete$ = this.estEdition
      ? this.employeeAdministrationService.update(this.employee!._id, {
          firstName: valeurs.firstName,
          lastName: valeurs.lastName,
          email: valeurs.email || undefined,
          phone: valeurs.phone,
          role: valeurs.role,
          address: valeurs.address,
        })
      : this.employeeAdministrationService.create({
          firstName: valeurs.firstName,
          lastName: valeurs.lastName,
          email: valeurs.email || undefined,
          phone: valeurs.phone,
          password: valeurs.password,
          role: valeurs.role,
          address: valeurs.address,
        });

    requete$.subscribe({
      next: (employe) => {
        this.enregistrementEnCours = false;
        this.notification.showSuccess(
          this.estEdition ? 'Employé mis à jour' : 'Employé créé',
          `${employe.firstName} ${employe.lastName} a été ${this.estEdition ? 'mis à jour' : 'créé'} avec succès.`,
        );
        this.saved.emit(employe);
      },
      error: (err: HttpErrorResponse) => {
        this.enregistrementEnCours = false;
        // Doublon téléphone/email ou rôle invalide -> message backend exact
        // (services/employeesAdministration.js), jamais reformulé ici.
        this.erreurApi = err.error?.message ?? "Une erreur est survenue. Veuillez réessayer.";
      },
    });
  }
}
