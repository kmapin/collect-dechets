import { Component } from '@angular/core';

import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-contact',
  imports: [RouterModule, FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact {
  formData = {
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: ''
  };

  onSubmit(): void {
    console.log('Form submitted:', this.formData);
    // Handle form submission
  }
}