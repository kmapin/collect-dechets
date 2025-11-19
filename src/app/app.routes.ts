import { Routes } from '@angular/router';
import { ForgotPassword } from './pages/auth/forgot-password/forgot-password';
import { AdminDashboard } from './pages/dashboards/admin-dashboard/admin-dashboard';
import { About } from './pages/about/about';
import { Agencies } from './pages/agencies/agencies';
import { AgencyDetails } from './pages/agency-details/agency-details';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { Contact } from './pages/contact/contact';
import { AgencyDashboard } from './pages/dashboards/agency-dashboard/agency-dashboard';
import { ClientDashboard } from './pages/dashboards/client-dashboard/client-dashboard';
import { CollectorDashboard } from './pages/dashboards/collector-dashboard/collector-dashboard';
import { MunicipalityDashboard } from './pages/dashboards/municipality-dashboard/municipality-dashboard';
import { Faq } from './pages/faq/faq';
import { Home } from './pages/home/home';
import { Privacy } from './pages/privacy/privacy';
import { Help } from './pages/help/help';
import { Profile } from './pages/profile/profile';
import { Report } from './pages/report/report';
import { Schedule } from './pages/schedule/schedule';
import { Subscription } from './pages/subscription/subscription';
import { Terms } from './pages/terms/terms';
import { WasteTypes } from './pages/waste-types/waste-types';
import { Chat } from './pages/chat/chat';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'agencies', component: Agencies },
  { path: 'agencies/:id', component: AgencyDetails },
  { path: 'waste-types', component: WasteTypes},
  { path: 'faq', component: Faq },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'about', component: About },
  { path: 'contact', component: Contact},
  { path: 'help', component: Help },
  { path: 'privacy', component: Privacy},
  { path: 'terms', component: Terms },
  { path: 'profile', component: Profile },
  { path: 'subscription', component: Subscription },
  { path: 'schedule', component: Schedule },
  { path: 'report', component: Report },
  { path: 'dashboard/client', component: ClientDashboard },
  { path: 'dashboard/agency', component: AgencyDashboard },
  { path: 'dashboard/collector', component: CollectorDashboard },
  { path: 'dashboard/municipality', component: MunicipalityDashboard},
  {path: 'edit-agency/:id', component: Register},
  {path: 'dashboard/admin', component: AdminDashboard},
  {path: 'chat', component: Chat},
  { path: '**', redirectTo: '' }
];