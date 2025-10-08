import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { OUAGA_DATA, QuartierData } from '../../data/mock-data';
import { NotificationService } from '../../services/notification.service';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';


@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  user: any;
  // Pour le select en cascade
  arrondissements: QuartierData[] = OUAGA_DATA;
  secteurs: { secteur: string; quartiers: string[] }[] = [];
  quartiers: string[] = [];

  // Pour agency
  allServices: string[] = [
    'Collecte ménagère',
    'Recyclage',
    'Collecte industrielle',
    'Collecte spéciale',
    'Traitement déchets dangereux'
  ];
  allSecteurs: { secteur: string; quartiers: string[] }[] = [];

  constructor(private authService: AuthService, private notificationService: NotificationService) { }

  ngOnInit(): void {
    this.getUser();
    
  }

  // generer code qr en image 
  generateQRCode(data: string): string {
    // Utiliser une API tierce pour générer le QR code
    return data ? data : "Pas de code QR généré";
  }

  // generer code qr en pdf 
  async downloadQRCodePDF(data: string) {
  if (!data) {
    console.error('Donnée QR vide');
    return;
  }
  try {
    // Génère le QR code en base64 PNG
    const qrCodeDataUrl = await QRCode.toDataURL(data, { width: 256, margin: 2 });
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Votre QR Code', 20, 20);
    // Ajoute l'image au PDF
    doc.addImage(qrCodeDataUrl, 'PNG', 40, 40, 120, 120);
    doc.save('qrcode.pdf');
  } catch (err) {
    console.error('Erreur lors de la génération du PDF QR:', err);
  }
}

  // async generateQRCodePDF(data: string): Promise<string> {
  //   if (!data) return '';
  //   try {
  //     return await QRCode.toDataURL(data, { width: 256, margin: 2 });
  //   } catch (err) {
  //     console.error('Erreur QRCode:', err);
  //     return '';
  //   }
  // }

  getUser(){
   this.authService.currentUser$.subscribe((user) => {
      this.user = user;
      console.log("loggedUser::>",this.user);
      // Sécurise l'accès à address
      if (!this.user.address) {
        this.user.address = {};
      }
      // Pré-remplir les secteurs si adresse présente
      if (this.user?.address?.arrondissement) {
        this.onArrondissementChange(this.user.address.arrondissement);
      }
      if (this.user?.address?.sector) {
        this.onSecteurChange(this.user.address.sector);
      }
      // Pour agency, charger tous les secteurs
      this.allSecteurs = this.arrondissements.flatMap(a => a.secteurs);
      
    });
    console.log("Current User", this.user); 
  }


  onArrondissementChange(arrondissement: string) {
    const arr = this.arrondissements.find(a => a.arrondissement === arrondissement);
    this.secteurs = arr ? arr.secteurs : [];
    this.quartiers = [];
    if (this.user?.address) {
      this.user.address.sector = '';
      this.user.address.neighborhood = '';
    }
  }

  onSecteurChange(secteur: string) {
    const secteurObj = this.secteurs.find(s => s.secteur === secteur);
    this.quartiers = secteurObj ? secteurObj.quartiers : [];
    if (this.user?.address) {
      this.user.address.neighborhood = '';
    }
  }

  getRoleLabel(role: string): string {
    const roleLabels: { [key: string]: string } = {
      'client': 'Client',
      'agency': 'Agence',
      'collector': 'Collecteur',
      'municipality': 'Mairie'
    };
    return roleLabels[role] || role;
  }

  onSave(): void {
    if (this.user.role === 'client') {
      const userEdit = {
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        phone: this.user.phone,
        address: {
          street: this.user.address?.street || '',
          doorNumber: this.user.address?.doorNumber || '',
          doorColor: this.user.address?.doorColor || '',
          arrondissement: this.user.address?.arrondissement || '',
          sector: this.user.address?.sector || '',
          neighborhood: this.user.address?.neighborhood || '',
          city: this.user.address?.city || '',
          postalCode: this.user.address?.postalCode || ''
        },
        termsAccepted: !!this.user.termsAccepted,
        receiveOffers: !!this.user.receiveOffers
      };
      this.authService.updateClient(this.user?.id, userEdit).subscribe(
        response => {
          this.notificationService.showSuccess('Modification réussie', 'Votre profil a été mis à jour avec succès.');
          this.getUser(); // Recharger les données utilisateur
        },
        error => {
          this.notificationService.showError('Erreur', 'Une erreur est survenue lors de la modification du profil.');
        }
      );
    } else if (this.user.role === 'agency') {
      const agencyEdit = {
        agencyName: this.user.agencyName,
        agencyDescription: this.user.agencyDescription,
        phone: this.user.phone,
        email: this.user.email,
        serviceZones: this.user.serviceZones || [],
        services: this.user.services || [],
        termsAccepted: !!this.user.termsAccepted,
        receiveOffers: !!this.user.receiveOffers
      };
      this.authService.updateClient(this.user?.id, agencyEdit).subscribe(
        response => {
          this.notificationService.showSuccess('Modification réussie', 'Le profil de l’agence a été mis à jour avec succès.');
          this.getUser(); // Recharger les données utilisateur
        },
        error => {
          this.notificationService.showError('Erreur', 'Une erreur est survenue lors de la modification du profil agence.');
        }
      );
    }
  }
}