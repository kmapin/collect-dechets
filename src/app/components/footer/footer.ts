import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  newsletterEmail = '';
  isSubmitting = false;
  
  particles = Array.from({ length: 20 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 6
  }));

  onNewsletterSubmit(event: Event): void {
    event.preventDefault();
    
    if (!this.newsletterEmail) return;
    
    this.isSubmitting = true;
    
    // Simuler l'envoi
    setTimeout(() => {
      this.isSubmitting = false;
      this.newsletterEmail = '';
      // Ici vous pourriez ajouter une notification de succès
      console.log('Newsletter subscription successful');
    }, 2000);
  }
}