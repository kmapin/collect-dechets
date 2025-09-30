import { CellWidthType } from "./../../../../../node_modules/jspdf-autotable/dist/index.d";
import { BarcodeFormat } from "@zxing/library";
import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, TitleStrategy } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../../services/auth.service";
import { CollectionService } from "../../../services/collection.service";
import { NotificationService } from "../../../services/notification.service";
import { ClientUser, User } from "../../../models/user.model";
import {
  Collection,
  CollectionStatus,
  CollectionReport,
} from "../../../models/collection.model";
import { ClientService } from "../../../services/client.service";
import { map } from "rxjs";
import { MessagesService } from "../../../services/messages.service";
import { AgencyService } from "../../../services/agency.service";
import { Message } from "../../../models/message.model";
import { MatIcon } from "@angular/material/icon";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PaymentHistory {
  id: string;
  date: Date;
  amount: number;
  status: "completed" | "pending" | "failed";
  description: string;
  method: string;
}

interface Subscription {
  id: string;
  serviceName: string;
  agencyName: string;
  price: number;
  frequency: string;
  status: "active" | "suspended" | "cancelled";
  nextPayment: Date;
}

@Component({
  selector: "app-client-dashboard",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatIcon],
  template: `
    <div class="client-dashboard">
      <div class="page-header">
        <div class="container">
          <div class="header-content">
            <div class="welcome-section">
              <h1 class="page-title">Bonjour {{ currentUser?.firstName }} !</h1>
              <p class="page-subtitle">
                Gérez vos collectes et abonnements en toute simplicité
              </p>
            </div>
            <div class="quick-actions">
               <button
                class="btn btn-primary"
                (click)="scrollToChat()"
                >
                <i class="material-icons">message</i>Mes messages
                <span  class="tab-badge">{{ unreadMessageCount}}</span>
              </button>
              <button
                *ngIf="currentUser?.subscribedAgencyId"
                class="btn btn-primary"
                routerLink="/agencies/{{ currentUser?.subscribedAgencyId }}"
              >
                <i class="material-icons">business</i>
                Mon agence
              </button>
              <button class="btn btn-primary" (click)="showReportModal = true">
                <i class="material-icons">report_problem</i>
                Signaler un problème
              </button>
              <button class="btn btn-secondary" routerLink="/profile">
                <i class="material-icons">settings</i>
                Mon profil
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="dashboard-content">
          <!-- Statistiques rapides -->
          <div class="stats-grid">
            <div class="stat-card card">
              <div class="stat-icon next-collection">
                <i class="material-icons">event</i>
              </div>
              <div class="stat-info" *ngIf="nextCollect; else noNextCollect">
                <h3>Prochaine collecte</h3>
                <p class="stat-value">
                  {{ nextCollect?.date | date : "dd MMMM" : "fr-FR" }}
                </p>
                <!-- <p class="stat-value">{{ getNextCollectionTime(nextCollect?.date)  }}</p> -->
                <!-- <span class="stat-detail">{{ getnextCollectionHour(nextCollect?.date) }}</span> -->
                <span class="stat-detail"
                  >entre {{ nextCollect?.startTime }} et
                  {{ nextCollect?.endTime }}
                </span>
              </div>
              <ng-template #noNextCollect>
                <p>
                  Pas de collecte prévue.<br />
                  <sub>Veuillez vérifier plus tard </sub>
                  <sub>ou contactez votre agence pour avoir un planning.</sub>
                </p>
              </ng-template>
            </div>

            <div class="stat-card card">
              <div class="stat-icon collections">
                <i class="material-icons">check_circle</i>
              </div>
              <div class="stat-info">
                <h3>Collectes de ce mois</h3>
                <p class="stat-value">
                  {{ getTotalCompletedCollectionsLength() }} /
                  {{ getMonthlyCollectionsLength() }}
                </p>
                <!-- <span class="stat-detail">{{ getCompletedCollectionRate() }}% de réussite ; {{ getUncompletedCollectionRate() }}% d'échecs</span> -->
                <span class="stat-detail"
                  ><i
                    class="material-icons"
                    style="color:var(--success-color);vertical-align:middle;"
                    >check_circle</i
                  >
                  {{ getCompletedCollectionRate() }}% &nbsp;;&nbsp;
                  <i
                    class="material-icons"
                    style="color:var(--error-color);vertical-align:middle;"
                    >cancel</i
                  >
                  {{ getUncompletedCollectionRate() }} % &nbsp;;&nbsp;
                  <i
                    class="material-icons"
                    style="color:var(--info-color);vertical-align:middle;"
                    >schedule</i
                  >
                  {{ getUpcomingCollectionRate() }} %
                </span>
              </div>
            </div>

            <!-- <div class="stat-card card">
              <div class="stat-icon subscription">
                <i class="material-icons">card_membership</i>
              </div>
              <div class="stat-info">
                <h3>Abonnement</h3>
                <p class="stat-value">{{ subscription?.serviceName }}</p>
                <span class="stat-detail">{{ subscription?.price }}€/mois</span>
              </div>
            </div> -->

            <div class="stat-card card">
              <div class="stat-icon payment">
                <i class="material-icons">payment</i>
              </div>
              <div class="stat-info" *ngIf="activeSubscription; else noSubscription">
                <h3>Prochain paiement</h3>
                <p class="stat-value">
                  {{
                    getNextPayment(
                      activeSubscription?.endDate | date : "dd MMMM yyyy"
                    )
                  }}
                </p>
                <span class="stat-detail"
                  >{{ activeSubscription?.amount }} F CFA</span
                >
              </div>
              <ng-template #noSubscription>
                <p>
                  Aucun abonnement actif.<br />
                  <sub>
                    Veuillez souscrire à un abonnement pour bénéficier de nos
                    services.
                  </sub>
                </p>
              </ng-template>
            </div>

            <div class="stat-card card">
              <div class="stat-icon collections">
                <i class="material-icons">wallet</i>
              </div>
              <div class="stat-info">
                <h3>Wallet</h3>
                <p class="stat-value">{{ clientBalance | number }} FCFA</p>
                <button
                  class="btn btn-secondary btn-small"
                  (click)="showRechargeModal = true"
                >
                  <i class="material-icons">refresh</i>
                  Recharger
                </button>
              </div>
            </div>
          </div>

          <!-- Contenu principal -->
          <div class="main-content">
            <div class="left-column">
              <!-- Prochains passages -->
              <section class="upcoming-collections card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">schedule</i>
                    Planning de la semaine
                  </h2>
                  <button
                    class="btn btn-secondary btn-small"
                    (click)="refreshCollections()"
                  >
                    <i class="material-icons">refresh</i>
                    Actualiser
                  </button>
                </div>

                <div class="collections-list">
                  <div
                    *ngFor="let collection of weeklySchedule"
                    class="collection-item"
                  >
                    <div class="collection-date">
                      <div class="day">{{ collection.date | date : "dd" }}</div>
                      <div class="month">
                        {{ collection.date | date : "MMM" }}
                      </div>
                    </div>
                    <div class="collection-info">
                      <!-- <h4>{{ getWasteTypeName(collection.wasteTypes[0]) }}</h4> -->
                      <h4>Collecte standard</h4>
                      <p class="collection-time">
                        <i class="material-icons">access_time</i>
                        {{ collection.startTime }}
                        <!-- {{ collection.startTime | date:'HH:mm' }} -->
                      </p>
                      <p class="collection-address">
                        <i class="material-icons">location_on</i>
                        {{ collection.zone }}
                      </p>
                    </div>
                    <div class="collection-status">
                      <span class="status-badge" [class]="'status-scheduled'">
                        {{
                          getStatusText(collection.isActive)
                            ? "Programmé"
                            : "Inactif"
                        }}
                      </span>
                      <div class="collection-actions">
                        <button
                          class="action-btn"
                          (click)="trackCollection(collection._id)"
                          *ngIf="collection.isActive === 'in_progress'"
                        >
                          <i class="material-icons">location_on</i>
                          Suivre
                        </button>
                        <button
                          class="action-btn"
                          (click)="reportIssue(collection._id)"
                          *ngIf="collection.isActive === true"
                        >
                          <i class="material-icons">report</i>
                          Signaler
                        </button>
                      </div>
                    </div>
                  </div>

                  <div *ngIf="weeklySchedule.length === 0" class="empty-state">
                    <i class="material-icons">event_available</i>
                    <h3>Aucune collecte programmée</h3>
                    <p>
                      Vos prochaines collectes de la semaine apparaîtront ici
                    </p>
                  </div>
                </div>
              </section>

              <!-- Historique des collectes -->
              <section class="collection-history card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">history</i>
                    Historique des collectes
                  </h2>
                  <!-- <div class="filter-controls">
                    <select
                      [(ngModel)]="historyFilter"
                      (change)="filterHistory()"
                      class="filter-select"
                    >
                      <option value="all">Toutes</option>
                      <option value="completed">Réalisées</option>
                      <option value="missed">Manquées</option>
                      <option value="cancelled">Annulées</option>
                    </select>
                  </div> -->
                </div>

                <div class="history-list">
                  <div
                    *ngFor="let collection of filteredHistories"
                    class="history-item"
                  >
                    <div class="history-date">
                      <div class="day">
                        {{ collection.scheduledDate | date : "dd" }}
                      </div>
                      <div class="month">
                        {{ collection.scheduledDate | date : "MMM" }}
                      </div>
                    </div>
                    <div class="history-info">
                      <h4>{{ getWasteTypeName(collection.wasteTypes[0]) }}</h4>
                      <p class="history-time">
                        {{ collection.scheduledDate | date : "HH:mm" }}
                      </p>
                      <p
                        class="history-collector"
                        *ngIf="collection.collectedDate"
                      >
                        Collecté le
                        {{ collection.collectedDate | date : "dd/MM à HH:mm" }}
                      </p>
                    </div>
                    <div class="history-status">
                      <span
                        class="status-badge"
                        [class]="'status-' + collection.status"
                      >
                        {{ getStatusText(collection.status) }}
                      </span>
                      <div
                        class="history-rating"
                        *ngIf="collection.status === 'completed'"
                      >
                        <div class="stars">
                          <i
                            *ngFor="
                              let star of getStars(collection.rating || 0)
                            "
                            class="material-icons star"
                            >star</i
                          >
                        </div>
                        <button
                          class="rate-btn"
                          (click)="rateCollection(collection.id)"
                          *ngIf="!collection.rating"
                        >
                          Noter
                        </button>
                      </div>
                    </div>
                  </div>

                  <div *ngIf="filteredHistories.length === 0" class="empty-state">
                    <i class="material-icons">history</i>
                    <h3>Aucun historique</h3>
                    <p>Vos collectes passées apparaîtront ici</p>
                  </div>
                </div>
              </section>

              <!-- Messages -->
              <!-- <section class="collection-message card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">message</i>
                    Messagerie
                  </h2>
                  <div class="filter-controls">
                    <span class="section-count"
                      >{{ unreadMessageCount }} message(s) non lu(s)</span
                    >
                  </div>
                </div>

                <div class="history-list history-message">
                  <div
                    *ngFor="let message of connectedUserMessages"
                    class="history-item"
                  >
                    <div class="history-date">
                      <div class="day">
                        {{ message.timestamp | date : "dd" }}
                      </div>
                      <div class="month">
                        {{ message.timestamp | date : "MMM" }}
                      </div>
                    </div>
                    <div class="history-info">
                      <h4>{{ message.content }}</h4>
                      <p class="history-time">
                        {{ message.timestamp | date : "HH:mm" }}
                      </p>
                      <p
                        class="history-collector"
                        *ngIf="message.sender !== currentUser?._id"
                      >
                        Reçu de
                        <span class="sender-name">{{
                          message.senderName
                        }}</span>
                      </p>
                      <p
                        class="history-collector"
                        *ngIf="message.sender === currentUser?._id"
                      >
                        Moi
                      </p>
                    </div>
                    <div class="history-status">
                      <span class="status-badge">
                        {{ message.read === "false" ? "Non lu" : "Lu" }}
                      </span>
                      <div
                        class="history-rating"
                        *ngIf="message.read === 'false'"
                      >
                        <button
                          class="rate-btn"
                          (click)="readAndRespondMessage(message)"
                          *ngIf="!message.rating"
                        >
                          Repondre
                        </button>
                      </div>
                    </div>
                  </div>

                  <div *ngIf="unreadMessageCount === 0" class="empty-state">
                    <i class="material-icons">history</i>
                    <h3>Aucun message</h3>
                    <p>Vos messages apparaîtront ici</p>
                  </div>
                </div>
              </section>
              -->
              <!-- Messages 2 -->
              <section class="collection-message card" #chatMessages>
                <div class="section-header">
                  <h2>
                    <i class="material-icons">message</i>
                    Messagerie
                  </h2>
                  <div class="filter-controls">
                    <span class="section-count"
                      >{{ unreadMessageCount }} message(s) non lu(s)</span
                    >
                  </div>
                </div>

                <!-- <div class="history-list history-message"> -->
                <div class="parent">
                  <!-- Header -->
                  <div class="chat-header-column">
                    <span *ngIf="displayAgencyName"
                      >Vous discutez avec {{ displayAgencyName }}</span
                    >
                  </div>

                  <div class="message-content">
                    <!-- Sidebar -->
                    <div class="chat-left-column">
                      <div class="chat-left-column-header">
                        <div class="chat-left-column-header-title">
                          Mes discussions
                        </div>
                      </div>

                      <div class="chat-left-column-content">
                        <ng-container
                          *ngFor="let message of connectedUserMessages"
                        >
                          <button
                            class="chat-left-column-content-item"
                            *ngIf="message.agencyName"
                            (click)="userAndAgencyConversation(message)"
                           >
                            {{ message.agencyName }}
                          </button>
                        </ng-container>
                      </div>
                    </div>
                    <!-- Messages + Input -->
                    <div class="chat-area">
                      
                      <div class="chat-messages" #scrollMe>
                        <ng-container *ngFor="let message of receivedMessages">
                          <div
                            class="received "
                            *ngIf="message.sender !== currentUser?.userId"
                          >
                            <div class="div5 chat-bubble">
                              <span> {{ message.content }}</span>
                              <span class="chat-time"
                                >reçu le
                                {{
                                  message.timestamp
                                    | date : "dd/MMM/yyyy à HH:mm"
                                }}
                                <mat-icon class="chat-read">
                                  {{
                                    message.read === "true"
                                      ? "done_all"
                                      : "done"
                                  }}
                                </mat-icon>
                              </span>
                            </div>
                          </div>
                          <div
                            class="sent"
                            *ngIf="message.sender === currentUser?.userId"
                          >
                            <div class="div6 chat-bubble">
                              <span> {{ message.content }}</span>
                              <span class="chat-time"
                                >envoyé le
                                {{
                                  message.timestamp
                                    | date : "dd/MMM/yyyy  à HH:mm"
                                }}
                                <mat-icon class="chat-read">
                                  {{
                                    message.read === "true"
                                      ? "done_all"
                                      : "done"
                                  }}
                                </mat-icon>
                              </span>
                            </div>
                          </div>
                        </ng-container>
                      </div>
                      <!-- Input fixé en bas -->
                      <div class="div7 chat-input-row">
                        <input
                          class="sendChatMessage"
                          [(ngModel)]="messageData.content"
                          name="content"
                          type="text"
                          placeholder="Composez votre message"
                        />
                        <div class="chat-actions">
                          <button
                            type="button"
                            (click)="submitMessage()"
                            class="btn_send btn-secondary"
                          >
                            <mat-icon class="material-icons">send</mat-icon>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Message -->
              <div
                class="modal-overlay"
                *ngIf="showMessageModal"
                (click)="showMessageModal = false"
              >
                <div class="modal-content" (click)="$event.stopPropagation()">
                  <div class="modal-header">
                    <h3>Décrivez nous votre besoins</h3>
                    <button
                      class="close-btn"
                      (click)="showMessageModal = false"
                    >
                      <i class="material-icons">close</i>
                    </button>
                  </div>
                  <form class="report-form">
                    <!-- <div class="form-group">
                      <label>Destinataire</label>
                      <select [(ngModel)]="messageData.receiver" name="receiver" required>
                        <option value="">Sélectionnez</option>
                        <option value="missed_collection">Collecte manquée</option>
                        <option value="compliance_issue">Non-conformité</option>
                        <option value="technical_issue">Problème technique</option>
                        <option value="complaint">Réclamation</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>-->

                    <div class="form-group">
                      <label>Message</label>
                      <textarea
                        [(ngModel)]="messageData.content"
                        name="content"
                        rows="4"
                        placeholder="Votre message..."
                        required
                      ></textarea>
                    </div>
                    <div class="form-actions">
                      <button
                        type="button"
                        class="btn btn-secondary"
                        (click)="showMessageModal = false"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        class="btn btn-primary"
                        (click)="submitMessage(); showMessageModal = false"
                      >
                        <i class="material-icons">send</i>
                        Envoyer
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div class="right-column">
              <!-- Informations d'abonnement -->
              <section class="subscription-info card bg-blue-100">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">card_membership</i>
                    Mon abonnement
                  </h2>
                  <button
                    class="btn btn-secondary btn-small"
                    routerLink="/subscription"
                  >
                    <i class="material-icons">edit</i>
                    Changer de forfait
                  </button>
                </div>

                <div
                  class="subscription-details"
                  *ngIf="activeSubscription; else noSub"
                >
                  <div class="subscription-service">
                    <h3>Collecte {{ activeSubscription.plan }}</h3>
                    <p>{{ activeSubscription.agencyId?.agencyName }}</p>
                  </div>

                  <div class="subscription-pricing">
                    <div class="price">
                      {{ activeSubscription.amount }} <sup>F CFA</sup>
                    </div>
                    <div class="frequency">par mois</div>
                  </div>

                  <div class="subscription-status">
                    <span
                      class="status-badge"
                      [class]="'status-' + activeSubscription.status"
                    >
                      {{ getSubscriptionStatusText(activeSubscription.status) }}
                    </span>
                  </div>

                  <!-- <div class="subscription-actions">
                    <button class="btn btn-primary btn-full" (click)="showPaymentModal = true">
                      <i class="material-icons">payment</i>
                      Payer maintenant
                    </button>
                    <button class="btn btn-secondary btn-small" routerLink="/subscription">
                    <i class="material-icons">edit</i>
                    Se réabonner
                  </button>
                  </div> -->
                </div>
                <ng-template #noSub>
                  <div class="info-item">
                    <span>Aucun abonnement actif.</span>
                  </div>
                </ng-template>
              </section>

              <!-- Paiement en ligne -->
              <!-- <section class="payment-section card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">payment</i>
                    Paiement
                  </h2>
                </div>

                <div class="payment-info" *ngIf="activeSubscription">
                  <div class="next-payment">
                    <h4>Prochain paiement</h4>
                    <p class="payment-date">{{ getNextPayment(activeSubscription?.endDate) }}</p>
                    <p class="payment-amount">{{ activeSubscription?.amount }} <sup>F CFA</sup></p>
                  </div>

                  <div class="payment-method">
                    <h4>Mode de paiement</h4>
                    <div class="payment-card">
                      <i class="material-icons">credit_card</i>
                      <span>**** **** **** 1234</span>
                      <button class="change-btn" (click)="changePaymentMethod()">Modifier</button>
                    </div>
                  </div>
                </div>
              </section> -->

              <!-- Historique des paiements -->
              <section class="payment-history card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">receipt</i>
                    Historique des paiements
                  </h2>
                  <button
                    class="btn btn-secondary btn-small"
                    (click)="downloadInvoices()"
                  >
                    <i class="material-icons">download</i>
                    Télécharger
                  </button>
                </div>

                <div class="payments-list">
                  <div
                    *ngFor="let payment of paymentHistory"
                    class="payment-item"
                  >
                    <div class="payment-date">
                      <div class="day">{{ payment.date | date : "dd" }}</div>
                      <div class="month">{{ payment.date | date : "MMM" }}</div>
                    </div>
                    <div class="payment-details">
                      <h4>{{ payment.description }}</h4>
                      <p class="payment-method-text">{{ payment.method }}</p>
                    </div>
                    <div class="payment-amount">
                      <span class="amount">{{ payment.amount }} FCFA</span>
                      <span
                        class="status-badge"
                        [class]="'status-' + payment.status"
                      >
                        {{
                          getPaymentStatusText(payment.status) === "active"
                            ? "Actif"
                            : getPaymentStatusText(payment.status) ===
                              "inactive"
                            ? "Inactif"
                            : getPaymentStatusText(payment.status) ===
                              "cancelled"
                            ? "Annulé"
                            : getPaymentStatusText(payment.status) ===
                              "refunded"
                            ? "Remboursé"
                            : getPaymentStatusText(payment.status) === "expired"
                            ? "Expiré"
                            : "En attente de réabonnement"
                        }}
                      </span>
                    </div>
                  </div>

                  <div *ngIf="paymentHistory.length === 0" class="empty-state">
                    <i class="material-icons">receipt</i>
                    <h3>Aucun paiement</h3>
                    <p>Vos paiements apparaîtront ici</p>
                  </div>
                </div>
              </section>

              <!-- Adresse de collecte -->
              <section class="collection-address flex flex-col card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">home</i>
                    Adresse de collecte
                  </h2>
                  <!-- <button class="btn btn-secondary btn-small" routerLink="/profile" (click)="editAddress()"> -->
                  <button
                    class="btn btn-secondary btn-small"
                    routerLink="/profile"
                  >
                    <i class="material-icons">edit</i>
                    Modifier
                  </button>
                </div>

                <div class="address-details" *ngIf="currentUser">
                  <div class="address-line">
                    <i class="material-icons">location_city</i>
                    <span>{{ currentUser.address?.city }}</span>
                  </div>
                  <div class="address-line">
                    <i class="material-icons">location_on</i>
                    <span>{{ currentUser?.address.arrondissement }} </span>
                  </div>
                  <div class="address-line">
                    <i class="material-icons">home</i>
                    <span
                      >{{ currentUser.address?.sector }},
                      {{ currentUser.address?.street }},
                      {{ currentUser.address?.neighborhood }}</span
                    >
                  </div>
                  <div class="address-line">
                    <i class="material-icons">palette</i>
                    <span>Porte : {{ currentUser.address?.doorColor }}</span>
                  </div>
                </div>

                <!-- <div class="address-map">
                  <div class="map-placeholder">
                    <i class="material-icons">map</i>
                    <p>Localisation précise</p>
                  </div>
                </div> -->
              </section>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de signalement -->
      <div
        class="modal-overlay"
        *ngIf="showReportModal"
        (click)="showReportModal = false"
      >
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Signaler un problème</h3>
            <button class="close-btn" (click)="showReportModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <form class="report-form" (ngSubmit)="submitReport()">
            <div class="form-group">
              <label>Type de problème</label>
              <select [(ngModel)]="reportData.type" name="type" required>
                <option value="">Sélectionnez</option>
                <option value="missed_collection">Collecte manquée</option>
                <option value="compliance_issue">Non-conformité</option>
                <option value="technical_issue">Problème technique</option>
                <option value="complaint">Réclamation</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea
                [(ngModel)]="reportData.description"
                name="description"
                rows="4"
                placeholder="Décrivez le problème..."
                required
              ></textarea>
            </div>
            <div class="form-group">
              <label>Etat du problème</label>
              <select
                [(ngModel)]="reportData.severity"
                name="severity"
                required
              >
                <option value="">Sélectionnez</option>
                <option value="low">Faible</option>
                <option value="medium">Moyen</option>
                <option value="high">Elevé</option>
                <option value="critical">Critique</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <!--<div class="form-group">
              <label>Date du problème</label>
              <input type="date" [(ngModel)]="reportData.date" name="date" required>
            </div>-->
            <div class="form-actions">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="showReportModal = false"
              >
                Annuler
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="material-icons">send</i>
                Envoyer
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal de paiement -->
      <div
        class="modal-overlay"
        *ngIf="showPaymentModal"
        (click)="showPaymentModal = false"
      >
        <div
          class="modal-content payment-modal"
          (click)="$event.stopPropagation()"
        >
          <div class="modal-header">
            <h3>Paiement sécurisé</h3>
            <button class="close-btn" (click)="showPaymentModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="payment-form">
            <div class="payment-summary">
              <h4>Récapitulatif</h4>
              <div class="summary-item">
                <span>{{ subscription?.serviceName }}</span>
                <span>{{ subscription?.price }}€</span>
              </div>
              <div class="summary-total">
                <span>Total</span>
                <span>{{ subscription?.price }}€</span>
              </div>
            </div>
            <div class="payment-methods">
              <h4>Mode de paiement</h4>
              <div class="payment-option">
                <input
                  type="radio"
                  id="card"
                  name="payment"
                  value="card"
                  checked
                />
                <label for="card">
                  <i class="material-icons">credit_card</i>
                  Carte bancaire
                </label>
              </div>
              <div class="payment-option">
                <input
                  type="radio"
                  id="transfer"
                  name="payment"
                  value="transfer"
                />
                <label for="transfer">
                  <i class="material-icons">account_balance</i>
                  Virement bancaire
                </label>
              </div>
            </div>
            <div class="form-actions">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="showPaymentModal = false"
              >
                Annuler
              </button>
              <button
                type="button"
                class="btn btn-primary"
                (click)="processPayment()"
              >
                <i class="material-icons">lock</i>
                Payer {{ subscription?.price }}€
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de de recharge du wallet -->
      <div
        class="modal-overlay"
        *ngIf="showRechargeModal"
        (click)="showRechargeModal = false"
      >
        <div
          class="modal-content payment-modal"
          (click)="$event.stopPropagation()"
        >
          <div class="modal-header">
            <h3>Recharger mon compte</h3>
            <button class="close-btn" (click)="showRechargeModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="payment-form">
            <div class="payment-methods">
              <h4>Mode de paiement</h4>
              <div class="payment-option">
                <input
                  type="radio"
                  id="card"
                  name="payment"
                  value="card"
                  checked
                />
                <label for="card">
                  <i class="material-icons">billet</i>
                  Orange money
                </label>
              </div>
              <div class="payment-option">
                <label for="amount">Montant :</label>
                <input
                  type="number"
                  min="100"
                  id="amount"
                  name="amount"
                  [(ngModel)]="rechargeAmount"
                  placeholder="Entrez le montant en FCFA"
                />
              </div>

              <!-- <div class="payment-option" >
                <input type="radio" id="transfer" name="payment" value="transfer" [disabled]="true">
                <label for="transfer">
                  <i class="material-icons">account_balance</i>
                  Virement bancaire
                </label>
              </div>
              
              <div class="payment-option">
                <input type="radio" id="card" name="payment" value="card"  [disabled]="true">
                <label for="card">
                  <i class="material-icons">credit_card</i>
                  Carte bancaire
                </label>
              </div> -->
            </div>

            <div class="payment-summary">
              <h4>Récapitulatif</h4>
              <div class="summary-item">
                <span>Solde actuel</span>
                <span>{{ clientBalance | number }} <sup>FCFA</sup></span>
              </div>
              <div class="summary-item">
                <span>Ajout</span>
                <span>{{ rechargeAmount | number }} <sup>FCFA</sup></span>
              </div>
              <div class="summary-total">
                <span>Total</span>
                <span
                  >{{ clientBalance + rechargeAmount | number }}
                  <sup>FCFA</sup></span
                >
              </div>
            </div>
            <div class="form-actions">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="showRechargeModal = false"
              >
                Annuler
              </button>
              <button
                type="button"
                class="btn btn-primary"
                (click)="walletPayment()"
              >
                <i class="material-icons">lock</i>
                Payer {{ rechargeAmount | number }} FCFA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .client-dashboard {
        min-height: 100vh;
        background: var(--light-gray);
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 24px;
      }

      .welcome-section h1 {
        color: var(--white);
        margin-bottom: 8px;
      }

      .welcome-section p {
        color: rgba(255, 255, 255, 0.9);
      }

      .quick-actions {
        display: flex;
        gap: 12px;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 24px;
        margin-bottom: 32px;
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 24px;
        transition: all 0.3s ease;
      }

      .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-medium);
      }

      .stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        font-size: 28px;
      }

      .stat-icon.next-collection {
        background: var(--primary-color);
      }
      .stat-icon.collections {
        background: var(--success-color);
      }
      .stat-icon.subscription {
        background: var(--secondary-color);
      }
      .stat-icon.payment {
        background: var(--accent-color);
      }

      .stat-info h3 {
        font-size: 1rem;
        font-weight: 500;
        margin-bottom: 4px;
        color: var(--text-secondary);
      }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 4px 0;
        color: var(--text-primary);
      }

      .stat-detail {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .main-content {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 32px;
        padding: 0px;
      }

      .left-column,
      .right-column {
        display: flex;
        flex-direction: column;
        /*gap: 24px;*/
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--medium-gray);
      }

      .section-header h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 1.3rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }

      .btn-small {
        padding: 8px 16px;
        font-size: 0.9rem;
      }

      .collections-list,
      .history-list,
      .payments-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .collection-item,
      .history-item,
      .payment-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: var(--light-gray);
        border-radius: 8px;
        transition: all 0.3s ease;
      }

      .collection-item:hover,
      .history-item:hover,
      .payment-item:hover {
        background: #f0f0f0;
      }

      .collection-date,
      .history-date,
      .payment-date {
        text-align: center;
        min-width: 50px;
      }

      .day {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary-color);
        line-height: 1;
      }

      .month {
        font-size: 0.8rem;
        color: var(--text-secondary);
        text-transform: uppercase;
      }

      .collection-info,
      .history-info,
      .payment-details {
        flex: 1;
      }

      .collection-info h4,
      .history-info h4,
      .payment-details h4 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--text-primary);
      }

      .collection-time,
      .collection-address,
      .history-time,
      .history-collector,
      .payment-method-text {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin: 2px 0;
      }

      .collection-status,
      .history-status {
        text-align: right;
      }
      .tab-badge {
        background: var(--error-color);
        color: var(--white);
        font-size: 0.7rem;
        padding: 2px 6px;
        border-radius: 10px;
        min-width: 16px;
        text-align: center;
      }
      .status-badge {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
      }

      .status-scheduled {
        background: #e3f2fd;
        color: var(--primary-color);
      }
      .status-in_progress {
        background: #fff3e0;
        color: #f57c00;
      }
      .status-completed {
        background: #e8f5e8;
        color: var(--success-color);
      }
      .status-missed {
        background: #ffebee;
        color: var(--error-color);
      }
      .status-cancelled {
        background: #f5f5f5;
        color: var(--text-secondary);
      }
      .status-active {
        background: #e8f5e8;
        color: var(--success-color);
      }
      .status-suspended {
        background: #fff3e0;
        color: #f57c00;
      }

      .collection-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .action-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        background: var(--white);
        border: 1px solid var(--medium-gray);
        border-radius: 6px;
        color: var(--text-primary);
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .action-btn:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      .filter-controls {
        display: flex;
        gap: 12px;
      }

      .filter-select {
        padding: 8px 12px;
        border: 1px solid var(--medium-gray);
        border-radius: 6px;
        font-size: 0.9rem;
      }

      .history-rating {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
      }

      .stars {
        display: flex;
        gap: 2px;
      }

      .star {
        font-size: 16px;
        color: var(--warning-color);
      }

      .rate-btn {
        padding: 4px 8px;
        background: var(--primary-color);
        color: var(--white);
        border: none;
        border-radius: 4px;
        font-size: 0.8rem;
        cursor: pointer;
      }

      .subscription-details {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .subscription-service h3 {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--text-primary);
      }

      .subscription-service p {
        color: var(--text-secondary);
      }

      .subscription-pricing {
        display: flex;
        align-items: baseline;
        gap: 8px;
      }

      .price {
        font-size: 2rem;
        font-weight: 700;
        color: var(--primary-color);
      }

      .frequency {
        color: var(--text-secondary);
      }

      .btn-full {
        width: 100%;
      }

      .payment-info {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .next-payment,
      .payment-method {
        padding: 16px;
        background: var(--light-gray);
        border-radius: 8px;
      }

      .next-payment h4,
      .payment-method h4 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--text-primary);
      }

      .payment-date {
        font-size: 1.1rem;
        color: var(--text-primary);
        margin-bottom: 4px;
      }

      .payment-amount {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary-color);
      }

      .payment-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--white);
        border-radius: 6px;
      }

      .change-btn {
        margin-left: auto;
        padding: 4px 8px;
        background: none;
        border: 1px solid var(--primary-color);
        color: var(--primary-color);
        border-radius: 4px;
        font-size: 0.8rem;
        cursor: pointer;
      }

      .payment-amount {
        text-align: right;
      }

      .amount {
        display: block;
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 4px;
      }

      .address-details {
        margin-bottom: 16px;
      }

      .address-line {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0;
        color: var(--text-primary);
      }

      .address-line i {
        color: var(--primary-color);
        font-size: 20px;
      }

      .address-map {
        margin-top: 16px;
      }

      .map-placeholder {
        height: 150px;
        background: var(--light-gray);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
      }

      .map-placeholder i {
        font-size: 32px;
        margin-bottom: 8px;
      }

      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-secondary);
      }

      .empty-state i {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .empty-state h3 {
        font-size: 1.2rem;
        margin-bottom: 8px;
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-content {
        background: var(--white);
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--medium-gray);
      }

      .modal-header h3 {
        font-size: 1.3rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .close-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        transition: all 0.3s ease;
      }

      .close-btn:hover {
        background: var(--light-gray);
      }

      .report-form,
      .payment-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .form-group label {
        font-weight: 500;
        color: var(--text-primary);
      }

      .form-group input,
      .form-group select,
      .form-group textarea {
        padding: 12px 16px;
        border: 2px solid var(--medium-gray);
        border-radius: 8px;
        font-family: "Inter", sans-serif;
        transition: border-color 0.3s ease;
      }

      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: var(--primary-color);
      }

      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 16px;
      }

      .payment-modal {
        max-width: 600px;
      }

      .payment-summary {
        background: var(--light-gray);
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 24px;
      }

      .payment-summary h4 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 16px;
        color: var(--text-primary);
      }

      .summary-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--medium-gray);
      }

      .summary-total {
        display: flex;
        justify-content: space-between;
        padding: 12px 0;
        font-weight: 600;
        font-size: 1.1rem;
        color: var(--text-primary);
        border-top: 2px solid var(--primary-color);
        margin-top: 8px;
      }

      .payment-methods h4 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 16px;
        color: var(--text-primary);
      }

      .payment-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 2px solid var(--medium-gray);
        border-radius: 8px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .payment-option:hover {
        border-color: var(--primary-color);
      }

      .payment-option input[type="radio"]:checked + label {
        color: var(--primary-color);
      }

      .payment-option label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        flex: 1;
      }
      /**Grid messagerie start */

      .parent {
        display: flex;
        flex-direction: column;
        height: 700px; /* prend toute la hauteur */
      }

      /* Header */
      .chat-header-column {
        background-color: var(--medium-gray);
        height: 50px;
        padding: 10px;
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
        text-align: center;
      }

      /* Zone centrale (sidebar + chat) */
      .message-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      /* Sidebar */
      .chat-left-column {
        width: 30%;
        background-color: var(--medium-gray);
        padding: 10px;
      }

      /* Zone chat (messages + input) */
      .chat-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #f9f9f9;
        background-image: url("../../../../assets/chatBg/chat_background.png");
        background-size: cover;
      }

      /* Messages scrollables */
      .chat-messages {
        flex: 1;
        padding: 10px;
        overflow-y: auto;
      }
      /* Messages reçus (à gauche) */
      .received {
        display: flex;
        justify-content: flex-start;
      }

      .div5 {
        background-color: var(--medium-gray);
        padding: 10px;
        border-radius: 10px;
        max-width: 60%;
      }

      /* Messages envoyés (à droite) */
      .sent {
        display: flex;
        justify-content: flex-end;
      }

      .div6 {
        background-color: var(--message-send);
        padding: 10px;
        border-radius: 10px;
        max-width: 60%;
      }
      .received .chat-bubble {
        background: #eff3f1;
        color: #000;
        padding: 8px 14px;
        border-radius: 8px;
        display: inline-block;
        margin: 2% 0;
        max-width: 80%;
        font-size: 14px;
      }

      .sent .chat-bubble {
        background: #6cee9e;
        color: #000;
        padding: 8px 14px;
        border-radius: 6px;
        display: inline-block;
        margin: 2% 0;
        max-width: 80%;
        /* font-weight: bold; */
        font-size: 14px;
      }

      /* Input en bas */
      .div7 {
        display: flex;
        align-items: center;
        background-color: var(--medium-gray);
        padding: 10px;
      }

      .div7 input {
        flex: 1;
        padding: 8px;
        border-radius: 6px;
        border: none;
      }

      .chat-actions button {
        margin-left: 10px;
        width: fit-content;
      }

      .sendChatMessage {
        flex: 1;
        border-radius: 30px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        border: 1px solid #ccc;
        padding: 10px 20px;
        outline: none;
        width: 100%;
        font-size: 14px;
        transition: box-shadow 0.2s ease;
      }
      .chat-input-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .chat-actions > button {
        justify-content: center;
        align-items: center;
        display: flex;
        height: 40px;
      }
      .chat-actions mat-icon {
        font-size: 25px;
      }

      .material-icons {
        font-family: "Material Icons";
        font-weight: normal;
        font-style: normal;
      }
      .sendChatMessage:focus {
        box-shadow: 0 0 0 3px rgba(100, 150, 255, 0.3);
        border-color: #6495ff;
      }
      .chat-time {
        display: block;
        justify-items: center;
        text-align: right;
        font-size: 8px;
        margin-top: 5px;
      }
      .chat-read {
        font-size: 14px;
        margin-top: 0px;
        padding-top: 5px;
        width: fit-content;
        height: fit-content;
      }
      /**left column chat css */
      .chat-left-column-header {
        padding: 16px;
        background-color: var(--surface-400, #4caf50);
        color: #fff;
        margin-bottom: 10px;
        font-weight: bold;
        font-size: 16px;
        border-bottom: 1px solid #ddd;
        border-radius: 5px 5px 0 0;
      }

      /*Liste des discussions*/
      .chat-left-column-content {
        flex: 1;
        max-height: 500px;
        overflow-y: auto;
      }

      .chat-left-column-content-item {
        display: flex;
        padding: 12px 16px;
        min-width: 100%;
        font-size: 14px;
        align-self: start;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        background-color: var(--surface-300);
        transition: background-color 0.2s;
      }

      .chat-left-column-content-item:hover {
        background-color: #f9f9f9;
      }

      .chat-left-column-content-item.active {
        background-color: #e6f4ea;
        font-weight: bold;
      }
      /** Grid messagerie end */

      @media (max-width: 1024px) {
        .main-content {
          grid-template-columns: 1fr;
        }

        .header-content {
          flex-direction: column;
          text-align: center;
        }
      }

      @media (max-width: 768px) {
        .stats-grid {
          grid-template-columns: 1fr;
        }

        .collection-item,
        .history-item,
        .payment-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }

        .collection-status,
        .history-status {
          text-align: left;
          width: 100%;
        }

        .modal-content {
          margin: 20px;
          width: calc(100% - 40px);
        }
      }
    `,
  ],
})
export class ClientDashboardComponent implements OnInit, AfterViewChecked {
  @ViewChild("scrollMe") private myScrollContainer!: ElementRef;
  @ViewChild('chatMessages') chatMessages!: ElementRef;
  currentUser!: any;
  upcomingCollections: Collection[] = [];
  collectionHistory: any[] = [];
  filteredHistory: Collection[] = [];
  filteredHistories: any;
  paymentHistory: PaymentHistory[] = [];
  subscription: Subscription | null = null;

  historyFilter = "all";
  showReportModal = false;
  showPaymentModal = false;

  reportData = {
    type: "",
    description: "",
    severity: "",
    clientId: "",
    agencyId: "",
  };
  unreadMessageCount: any;
  receivedMessages: any;
  connectedUserMessages: any;
  agency: any;
  showMessageModal: boolean = false;
  receivedId: string = "";
  messageData: Message = {
    sender: "",
    receiver: "",
    content: "",
  };
  data: any;
  subscriptions: any[] = [];
  activeSubscription: any = null;
  showRechargeModal: boolean = false;

  // Montant de recharge
  rechargeAmount: number = 0;
  displayAgencyName: any;
  constructor(
    private authService: AuthService,
    private collectionService: CollectionService,
    private clientService: ClientService,
    private notificationService: NotificationService,
    private messageService: MessagesService,
    private agencyService: AgencyService
  ) {}

  ngOnInit(): void {
    // this.currentUser = this.authService.getCurrentUser();
    this.getUser();
    // console.log("Current User", this.currentUser);
    this.loadDashboardData();
  }

  getUser() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.getUserSubscription();
      this.getClientWallet();
      this.getWeeklySchedule();
      this.loadPlanningHistory();
    });
    console.log("Current User", this.currentUser);
  }

  //  GET CLIENT WALLET
  clientBalance!: number;
  getClientWallet() {
    const clientId = this.currentUser?.id || "";
    if (!clientId) return;
    this.clientService.getClientWallet(clientId).subscribe({
      next: (response: any) => {
        if (response && response.balance) {
          this.clientBalance = response?.balance;
          console.log("Client Wallet:", response.balance, this.clientBalance);
        }
        // return response?.balance;
      },
      error: (error: any) => {
        console.error(
          "Erreur lors de la récupération du portefeuille client:",
          error
        );
      },
    });
  }

  // Virer dans le Wallet du client
  walletPayment() {
    const clientId = this.currentUser?.id || "";
    if (!clientId) return;

    const paymentData = {
      amount: this.rechargeAmount,
      clientId: clientId,
    };
    console.log("Données de paiement du wallet:", paymentData);
    if (this.rechargeAmount < 100) {
      this.notificationService.showError(
        "Montant invalide",
        "Le montant de recharge doit être au moins de 100 FCFA."
      );
      return;
    }

    this.clientService.walletPayment(paymentData).subscribe({
      next: (response: any) => {
        console.log("Paiement effectué avec succès:", response?.wallet);
        this.getClientWallet();
        this.notificationService.showSuccess(
          "Paiement réussi",
          "Votre compte a été rechargé avec succès."
        );
        this.showRechargeModal = false;
        this.rechargeAmount = 0;
      },
      error: (error: any) => {
        this.notificationService.showError(
          "Erreur de paiement",
          "Une erreur est survenue lors du paiement. Veuillez réessayer."
        );
        console.error("Erreur lors du paiement:", error);
      },
    });
  }

  // recuperer le planning de collecte de la semaine du client
  weeklySchedule: any[] = [];

  nextCollect: any;
  getWeeklySchedule() {
    const clientId = this.currentUser?._id || "";
    if (!clientId) return;

    this.clientService.getClientPlanning(clientId).subscribe({
      next: (response: any) => {
        console.log("API > getClientPlanning:", response);
        this.weeklySchedule = response?.plannings || [];
        if (this.weeklySchedule.length) {
          this.nextCollect = this.weeklySchedule[0];
          console.log("Next collect ==> ", this.nextCollect);
        }
        // Traiter le planning récupéré
      },
      error: (error: any) => {
        console.error("Erreur lors de la récupération du planning:", error);
      },
    });
  }
  // Recuperer le nombre de passage du mois

  getMonthlyCollectionsLength() {
    const currentMonth = new Date().getMonth();
    const monthlyCollections = this.collectionHistory.filter((col) => {
      const collectionDate = col.scheduledDate;
      return (
        collectionDate &&
        collectionDate.getMonth() === currentMonth &&
        collectionDate.getFullYear() === new Date().getFullYear()
      );
    });
    return monthlyCollections.length * 4;
  }
  getMonthlyCollectionsLengthgetMonthlyCollections() {
    const currentMonth = new Date().getMonth();
    const monthlyCollections = this.collectionHistory.filter((col) => {
      const collectionDate = col.scheduledDate;
      return (
        collectionDate &&
        collectionDate.getMonth() === currentMonth &&
        collectionDate.getFullYear() === new Date().getFullYear()
      );
    });
    return monthlyCollections;
  }

  // Completed collection datad
  getTotalCompletedCollectionsLength() {
    const completedCollections = this.collectionHistory.filter(
      (col) => col.status === "completed"
    ).length;
    return completedCollections;
  }
  getTotalCompletedCollections() {
    const completedCollections = this.collectionHistory.filter(
      (col) => col.status === "completed"
    );
    return completedCollections;
  }

  getTotalUnCompletedCollectionLength() {
    const unCompletedCollections = this.collectionHistory.filter(
      (col) => col.status === "missed" || col.status === "cancelled"
    ).length;
    return unCompletedCollections;
  }

  getTotalUpcomingCollectionsLength() {
    // const upcomingCollections = this.collectionHistory.filter(
    //   (col) => col.status === "scheduled"
    // ).length;
    const totalCollections = this.getMonthlyCollectionsLength();
    const completedCollections = this.getTotalCompletedCollectionsLength();
    const unCompletedCollections = this.getTotalUnCompletedCollectionLength();
    const upcomingCollections =
      totalCollections - (completedCollections + unCompletedCollections);
    return upcomingCollections;
  }

  // Taux de collectes complétées
  getCompletedCollectionRate() {
    const totalCollections = this.getMonthlyCollectionsLength();
    const completedCollections = this.getTotalCompletedCollectionsLength();
    if (totalCollections === 0) return 0;

    return Math.round((completedCollections / totalCollections) * 100);
  }
  // Taux de collectes non complétées
  getUncompletedCollectionRate() {
    const totalCollections = this.getMonthlyCollectionsLength();
    const unCompletedCollections = this.getTotalUnCompletedCollectionLength();
    if (totalCollections === 0) return 0;

    return Math.round((unCompletedCollections / totalCollections) * 100);
  }

  // Taux de collectes à venir
  getUpcomingCollectionRate() {
    const totalCollections = this.getMonthlyCollectionsLength();
    const upcomingCollections = this.getTotalUpcomingCollectionsLength();
    if (totalCollections === 0) return 0;
    return Math.round((upcomingCollections / totalCollections) * 100);
  }

  // Recuperer l'historique des collectes déjà effectuées
  loadPlanningHistory(): void {
    const clientId = this.currentUser?._id || "";
    if (!clientId) return;
    this.clientService.getClientPlanningHistory(clientId).subscribe({
      next: (response: any) => {
        // this.collectionHistory = response.reports || [];
        this.collectionHistory = (response.reports || []).map(
          (report: any) => ({
            id: report._id,
            clientId: report.clientId,
            agencyId: report.agencyId,
            collectorId: report.collectorId,
            scheduledDate: report.createdAt ? new Date(report.createdAt) : null,
            collectedDate: report.scannedAt ? new Date(report.scannedAt) : null, // si dispo
            status: report.status === "collected" ? "completed" : report.status, // adapter au template
            wasteTypes: report.wasteTypes || ["Déchets ménagers"], // valeur par défaut si absent
            rating: report.rating || 0,
            photos: report.photos,
            positionGPS: report.positionGPS,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
          })
        );
        console.log("Planning history ==> ", this.collectionHistory);
        this.filteredHistories = [...this.collectionHistory];
        console.log("Filtered histories ==> ", this.filteredHistories);
        // Appliquer le filtre initial
        // this.applyHistoryFilter();
      },
      error: (error: any) => {
        console.error(
          "Erreur lors de la récupération de l'historique des collectes:",
          error
        );
      },
    });
  }

  // Afficher abonnement
  getUserSubscription() {
    const userID = this.currentUser?.id || "";
    if (!userID) return;
    this.agencyService.getUserSubscription(userID).subscribe({
      next: (response: any[]) => {
        this.subscriptions = response || [];
        this.paymentHistory = this.subscriptions.map((sub: any) => ({
          id: sub._id,
          date: sub.createdAt ? new Date(sub.createdAt) : new Date(),
          amount: sub.amount,
          status: sub.status, // "active", "suspended", "cancelled" ou autre
          description: `Abonnement ${sub.plan} - ${
            sub.agencyId?.agencyName || ""
          }`,
          method: "Orange Money", // ou autre selon tes données
        }));
        // Pour la subscription active
        this.activeSubscription = this.subscriptions.length
          ? this.subscriptions[this.subscriptions.length - 1]
          : null;
        console.log("Active subscription ==>", this.activeSubscription);
        console.log("Payment history ==>", this.paymentHistory);
      },
      error: (err) => {
        console.error("Erreur lors du chargement des abonnements", err);
      },
    });
  }

  renewSubscription() {
    // Logique pour renouveler l'abonnement
    alert("Fonction de renouvellement d'abonnement à implémenter.");
  }
  contactSupport() {
    // Logique pour contacter le support
    alert("Fonction de contact support à implémenter.");
  }

  loadDashboardData(): void {
    // Charger les données du tableau de bord
    this.loadUpcomingCollections();
    this.loadCollectionHistory();
    this.loadPaymentHistory();
    this.loadSubscription();
    this.countUnreadMessages();
    this.userMessages();
  }

  /**Gestion des messages recus par le client connecté */
  countUnreadMessages() {
    this.messageService
      .getUserUnreadMessagesCount(this.currentUser?.userId || "")
      .subscribe({
        next: (response: any) => {
          if (response) {
            console.log("API > getUserUnreadMessagesCount:", response);
            this.unreadMessageCount = response.unreadCount || 0;
          }
        },
        error: (error: any) => {
          console.error("API > getUserUnreadMessagesCount:", error);
        },
      });
  }

  userMessages() {
    this.messageService
      .getMessagesForUser(this.currentUser?.userId || "")
      .subscribe({
        next: (response: any) => {
          if (response) {
            console.log("API > getMessagesForUser:", response);
            this.connectedUserMessages = response || [];
            console.log(
              "this.connectedUserMessages:",
              this.connectedUserMessages
            );
          }
        },
        error: (error: any) => {
          console.error("API > getMessagesForUser:", error);
        },
      });
  }

  userAndAgencyConversation(agency: any) {
    this.data = agency;
    this.displayAgencyName = agency.agencyName;
    const agencyId = agency?.userId;
    this.clientService
      .userAndAgencyConversation(this.currentUser?.userId || "", agencyId)
      .subscribe((response: any) => {
        console.log("API >userAndAgencyConversation:", response);
        if (response) {
          console.log("API >userAndAgencyConversation:", response);
          this.receivedMessages = (response.messages || []).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          this.scrollToBottom()
          this.countUnreadMessages();
          if (!agencyId) {
            this.receivedId = this.currentUser?.userId;
          } else {
            this.receivedId = agencyId;
          }
          this.receivedMessages.forEach((message: any) => {
            if (message.receiver === this.currentUser?.userId) {
              this.readAndRespondMessage(message);
            }
            message.read = message.read.toString();
          });
        } else {
          this.receivedMessages = [];
          this.notificationService.showError(
            "Erreur",
            "Aucun message, veuillez contacter l'agence !"
          );
        }
      });
  }
  readAndRespondMessage(message: Message): void {
    this.messageService.markMessagesAsRead(message._id || "").subscribe({
      next: (response: any) => {
        this.receivedId = message.sender;
        console.log("Lire et répondre au message:", message._id);
      },
      error: (error: any) => {
        console.error("Erreur lors de la lecture du message:", error);
      },
    });
  }
  submitMessage() {
    if (!this.currentUser) {
      this.notificationService.showError(
        "Connexion requise",
        "Vous devez être connecté pour envoyer un message"
      );
      return;
    }
    if (!this.receivedId) {
      this.notificationService.showError("Erreur", "Agence non trouvée");
      return;
    }
    this.messageData.sender = this.currentUser?.userId || "";
    this.messageData.receiver = this.receivedId || "";
    this.messageData.content = this.messageData.content.trim();

    if (!this.messageData.content) {
      this.notificationService.showError(
        "Message vide",
        "Le contenu du message ne peut pas être vide"
      );
      return;
    }

    console.log("Envoi du message:", this.messageData);
    this.messageService.sendMessage(this.messageData).subscribe({
      next: (response: any) => {
        console.log("API > sendMessage:", response);
        console.log("API > data:", this.data);
        this.userAndAgencyConversation(this.data);
        this.notificationService.showSuccess(
          "Message envoyé",
          "Votre message a bien été envoyé"
        );
        this.messageData.content = "";
      },
      error: (error: any) => {
        console.error("API > sendMessage:", error);
        this.notificationService.showError(
          "Message non envoyé",
          "Une erreur s'est produite lors de l'envoi du message"
        );
      },
    });
  }

  /**Gestion des messages recus par le client connecté fin */

  loadUpcomingCollections(): void {
    // Simuler les prochaines collectes
    this.upcomingCollections = [
      {
        id: "1",
        clientId: "client1",
        agencyId: "agency1",
        collectorId: "collector1",
        scheduledDate: new Date("2024-01-15T09:00:00"),
        status: CollectionStatus.SCHEDULED,
        address: {
          street: "Rue des Roses",
          doorNumber: "15",
          doorColor: "blue",
          neighborhood: "Centre-ville",
          city: "Paris",
          postalCode: "75001",
        },
        wasteTypes: [
          {
            id: "1",
            name: "Déchets ménagers",
            description: "",
            icon: "delete",
            color: "#4caf50",
            instructions: [],
            acceptedItems: [],
            rejectedItems: [],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        clientId: "client1",
        agencyId: "agency1",
        collectorId: "collector1",
        scheduledDate: new Date("2024-01-18T10:00:00"),
        status: CollectionStatus.SCHEDULED,
        address: {
          street: "Rue des Roses",
          doorNumber: "15",
          doorColor: "blue",
          neighborhood: "Centre-ville",
          city: "Paris",
          postalCode: "75001",
        },
        wasteTypes: [
          {
            id: "2",
            name: "Recyclables",
            description: "",
            icon: "recycling",
            color: "#2196f3",
            instructions: [],
            acceptedItems: [],
            rejectedItems: [],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  loadCollectionHistory(): void {
    // Simuler l'historique des collectes
    this.collectionHistory = [
      {
        id: "3",
        clientId: "client1",
        agencyId: "agency1",
        collectorId: "collector1",
        scheduledDate: new Date("2024-01-08T09:00:00"),
        collectedDate: new Date("2024-01-08T09:30:00"),
        status: CollectionStatus.COMPLETED,
        address: {
          street: "Rue des Roses",
          doorNumber: "15",
          doorColor: "blue",
          neighborhood: "Centre-ville",
          city: "Paris",
          postalCode: "75001",
        },
        wasteTypes: [
          {
            id: "1",
            name: "Déchets ménagers",
            description: "",
            icon: "delete",
            color: "#4caf50",
            instructions: [],
            acceptedItems: [],
            rejectedItems: [],
          },
        ],
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    this.filteredHistory = [...this.collectionHistory];
  }

  loadPaymentHistory(): void {
    this.paymentHistory = [
      {
        id: "1",
        date: new Date("2024-01-01"),
        amount: 25.99,
        status: "completed",
        description: "Abonnement mensuel - Janvier 2024",
        method: "Carte bancaire **** 1234",
      },
      {
        id: "2",
        date: new Date("2023-12-01"),
        amount: 25.99,
        status: "completed",
        description: "Abonnement mensuel - Décembre 2023",
        method: "Carte bancaire **** 1234",
      },
    ];
  }

  loadSubscription(): void {
    this.subscription = {
      id: "1",
      serviceName: "Collecte Standard",
      agencyName: "EcoClean Services",
      price: 25.99,
      frequency: "mensuel",
      status: "active",
      nextPayment: new Date("2024-02-01"),
    };
  }

  getNextCollection(): string {
    if (this.upcomingCollections.length > 0) {
      return this.upcomingCollections[0].scheduledDate.toLocaleDateString(
        "fr-FR",
        {
          day: "numeric",
          month: "long",
        }
      );
    }
    return "Aucune programmée";
  }

  getNextCollectionType(): string {
    if (this.upcomingCollections.length > 0) {
      return this.upcomingCollections[0].wasteTypes[0]?.name || "";
    }
    return "";
  }

  // getMonthlyCollections(): string {
  //   const completed = this.collectionHistory.filter(c => c.status === CollectionStatus.COMPLETED).length;
  //   const total = this.collectionHistory.length + this.upcomingCollections.length;
  //   return `${completed} / ${total}`;
  // }

  // getCollectionRate(): number {
  //   const completed = this.collectionHistory.filter(c => c.status === CollectionStatus.COMPLETED).length;
  //   const total = this.collectionHistory.length;
  //   return total > 0 ? Math.round((completed / total) * 100) : 100;
  // }

  getNextPayment(paiementDate: string | null): string {
    paiementDate = paiementDate || this.activeSubscription?.endDate;
    if (!paiementDate) return "Aucun paiement prévu";
    // return this.activeSubscription?.endDate.toLocaleDateString('fr-FR', {
    return (
      new Date(paiementDate).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      }) || ""
    );
  }
  getNextCollectionTime(collection: string | null): string {
    if (!collection) return "";
    return (
      new Date(collection).toLocaleTimeString("fr-FR", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }) || ""
    );
  }
  getnextCollectionHour(collection: string | null): string {
    if (!collection) return "";
    return (
      new Date(collection).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }) || ""
    );
  }

  getWasteTypeName(wasteType: any): string {
    return wasteType?.name || "Type inconnu";
  }

  getStatusText(status: CollectionStatus): string {
    const statusTexts = {
      [CollectionStatus.SCHEDULED]: "Programmé",
      [CollectionStatus.IN_PROGRESS]: "En cours",
      [CollectionStatus.COMPLETED]: "Collecté",
      [CollectionStatus.MISSED]: "Manqué",
      [CollectionStatus.CANCELLED]: "Annulé",
      [CollectionStatus.REPORTED]: "Signalé",
    };
    return statusTexts[status] || status;
  }

  getSubscriptionStatusText(status: string): string {
    const statusTexts = {
      active: "Actif",
      suspended: "Suspendu",
      cancelled: "Annulé",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getPaymentStatusText(status: string): string {
    const statusTexts = {
      completed: "Payé",
      pending: "En attente",
      failed: "Échec",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getStars(rating: number): number[] {
    return new Array(Math.floor(rating)).fill(0);
  }

  refreshCollections(): void {
    this.loadUpcomingCollections();
    this.loadCollectionHistory();
    this.notificationService.showSuccess(
      "Actualisé",
      "Les collectes ont été mises à jour"
    );
  }

  filterHistory(): void {
    if (this.historyFilter === "all") {
      this.filteredHistory = [...this.collectionHistory];
    } else {
      this.filteredHistory = this.collectionHistory.filter(
        (c) => c.status === this.historyFilter
      );
    }
  }

  trackCollection(collectionId: string): void {
    this.notificationService.showInfo(
      "Suivi",
      "Le collecteur est en route vers votre adresse"
    );
  }

  reportIssue(collectionId: string): void {
    this.showReportModal = true;
  }

  rateCollection(collectionId: string): void {
    this.notificationService.showInfo(
      "Évaluation",
      "Fonctionnalité d'évaluation à venir"
    );
  }

  submitReport(): void {
    const data = {
      type: this.reportData.type,
      description: this.reportData.description,
      severity: this.reportData.severity,
      clientId: this.currentUser?._id,
      agencyId: this.currentUser?.subscribedAgencyId,
    };
    if (
      (this.reportData.type &&
        this.reportData.description &&
        this.reportData.clientId &&
        this.reportData.agencyId) ||
      this.reportData.severity
    ) {
      console.log("Signalement envoyé:", this.reportData);
      this.clientService.reportClientIncident(data).subscribe({
        next: (response: any) => {
          console.log("API > reportClientIncident:", response);
          this.notificationService.showSuccess(
            "Signalement envoyé",
            "Votre signalement a été transmis à l'agence"
          );
          this.showReportModal = false;
          this.reportData = {
            type: "",
            description: "",
            severity: "",
            clientId: "",
            agencyId: "",
          };
        },
        error: (error: any) => {
          console.error("API > reportClientIncident:", error);
          this.notificationService.showError(
            "Signalement non envoyé",
            "Une erreur s'est produite lors de l'envoi du signalement"
          );
        },
      });
    }
  }

  processPayment(): void {
    this.notificationService.showSuccess(
      "Paiement effectué",
      "Votre paiement a été traité avec succès"
    );
    this.showPaymentModal = false;
  }

  changePaymentMethod(): void {
    this.notificationService.showInfo(
      "Modification",
      "Redirection vers la gestion des moyens de paiement"
    );
  }

  // downloadInvoices(): void {
  //   this.notificationService.showInfo(
  //     "Téléchargement",
  //     "Génération des factures en cours..."
  //   );
  // }

  editAddress(): void {
    this.notificationService.showInfo(
      "Modification",
      "Redirection vers la modification d'adresse"
    );
  }

  // Fonction de generation du pdf de l'historique des paiements
  downloadInvoices(): void {
    const doc = new jsPDF();

    // HEADER DE TAILLE
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, doc.internal.pageSize.width, 30, "F"); // Bandeau bleu en haut

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("ZéroDéchet+", 14, 20);

    doc.setFontSize(13);
    doc.setTextColor(230, 230, 230);
    doc.setFont("helvetica", "normal");
    doc.text("Collecter aujourd’hui, préserver demain.", 14, 27);

    // Titre principal
    doc.setFontSize(18);
    doc.setTextColor(41, 128, 185);
    doc.setFont("helvetica", "bold");
    doc.text("Historique des paiements", 14, 45);

    // Sous-titre
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Client: ${this.currentUser?.firstName || ""} ${
        this.currentUser?.lastName || ""
      }`,
      14,
      53
    );
    doc.text(`Date: ${new Date().toLocaleDateString("fr-FR")}`, 14, 59);

    // Tableau des paiements
    autoTable(doc, {
      startY: 65,
      head: [["Date", "Description", "Méthode", "Montant", "Statut"]],
      body: this.paymentHistory.map((payment) => [
        payment.date ? new Date(payment.date).toLocaleDateString("fr-FR") : "",
        payment.description,
        payment.method,
        `${payment.amount} FCFA`,
        this.getPaymentStatusText(payment.status),
      ]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });

    // Pied de page stylisé tout en bas
    const pageHeight = doc.internal.pageSize.height || 297;
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.7);
    doc.line(14, pageHeight - 20, 195, pageHeight - 20);

    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.setFont("helvetica", "bold");
    doc.text(
      "Merci pour votre confiance !",
      doc.internal.pageSize.width / 2,
      pageHeight - 12,
      { align: "center" }
    );

    doc.save("Historique-paiement-client.pdf");
  }
  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  scrollToChat() {
    this.chatMessages.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }
}
