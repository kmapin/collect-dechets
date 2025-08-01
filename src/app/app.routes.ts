import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AgenciesComponent } from './pages/agencies/agencies.component';
import { WasteTypesComponent } from './pages/waste-types/waste-types.component';
import { FaqComponent } from './pages/faq/faq.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { AboutComponent } from './pages/about/about.component';
import { ContactComponent } from './pages/contact/contact.component';
import { HelpComponent } from './pages/help/help.component';
import { PrivacyComponent } from './pages/privacy/privacy.component';
import { TermsComponent } from './pages/terms/terms.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ClientDashboardComponent } from './pages/dashboards/client-dashboard/client-dashboard.component';
import { AgencyDashboardComponent } from './pages/dashboards/agency-dashboard/agency-dashboard.component';
import { CollectorDashboardComponent } from './pages/dashboards/collector-dashboard/collector-dashboard.component';
import { MunicipalityDashboardComponent } from './pages/dashboards/municipality-dashboard/municipality-dashboard.component';
import { AgencyDetailsComponent } from './pages/agency-details/agency-details.component';
import { SubscriptionComponent } from './pages/subscription/subscription.component';
import { ScheduleComponent } from './pages/schedule/schedule.component';
import { ReportComponent } from './pages/report/report.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'agencies', component: AgenciesComponent },
  { path: 'agencies/:id', component: AgencyDetailsComponent },
  { path: 'waste-types', component: WasteTypesComponent },
  { path: 'faq', component: FaqComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'help', component: HelpComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: 'terms', component: TermsComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'subscription', component: SubscriptionComponent },
  { path: 'schedule', component: ScheduleComponent },
  { path: 'report', component: ReportComponent },
  { path: 'dashboard/client', component: ClientDashboardComponent },
  { path: 'dashboard/agency', component: AgencyDashboardComponent },
  { path: 'dashboard/collector', component: CollectorDashboardComponent },
  { path: 'dashboard/municipality', component: MunicipalityDashboardComponent },
  { path: '**', redirectTo: '' }
];