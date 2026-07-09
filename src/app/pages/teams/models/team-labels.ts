// ── Libellés / couleurs / icônes partagés pour les enums Teams ──────
// Source unique de vérité : évite que chaque page (list, card, detail,
// detail-modal, members, form, dashboard, availability) redéfinisse sa
// propre traduction et dérive (ex: "active" affiché "Active" ici et
// "Disponible" ailleurs).
import { TeamStatus, VehicleStatus, VehicleType, MemberAvailability } from './team.model';

export type MissionStatusV = 'brouillon' | 'planifie' | 'en_cours' | 'termine' | 'annule';

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  active: 'Active', inactive: 'Inactive', on_mission: 'En mission', maintenance: 'Maintenance',
};
export const TEAM_STATUS_COLORS: Record<TeamStatus, string> = {
  active: '#16a34a', inactive: '#94a3b8', on_mission: '#f59e0b', maintenance: '#ef4444',
};
export function teamStatusLabel(s: string): string { return (TEAM_STATUS_LABELS as Record<string, string>)[s] ?? s; }
export function teamStatusColor(s: string): string { return (TEAM_STATUS_COLORS as Record<string, string>)[s] ?? '#64748b'; }

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  disponible: 'Disponible', en_service: 'En service', maintenance: 'Maintenance', hors_service: 'Hors service',
};
export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  disponible: '#16a34a', en_service: '#f59e0b', maintenance: '#ef4444', hors_service: '#94a3b8',
};
export function vehicleStatusLabel(s: string): string { return (VEHICLE_STATUS_LABELS as Record<string, string>)[s] ?? s; }
export function vehicleStatusColor(s: string): string { return (VEHICLE_STATUS_COLORS as Record<string, string>)[s] ?? '#64748b'; }

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  camion: 'Camion', pickup: 'Pickup', moto: 'Moto', tricycle: 'Tricycle',
};
export const VEHICLE_TYPE_ICONS: Record<VehicleType, string> = {
  camion: 'local_shipping', pickup: 'directions_car', moto: 'two_wheeler', tricycle: 'electric_rickshaw',
};
export function vehicleTypeLabel(t: string): string { return (VEHICLE_TYPE_LABELS as Record<string, string>)[t] ?? t; }
export function vehicleTypeIcon(t: string): string { return (VEHICLE_TYPE_ICONS as Record<string, string>)[t] ?? 'local_shipping'; }

export const MEMBER_AVAILABILITY_LABELS: Record<MemberAvailability, string> = {
  disponible: 'Disponible', occupe: 'Occupé', absent: 'Absent',
};
export const MEMBER_AVAILABILITY_COLORS: Record<MemberAvailability, string> = {
  disponible: '#16a34a', occupe: '#f59e0b', absent: '#94a3b8',
};
export const MEMBER_AVAILABILITY_ICONS: Record<MemberAvailability, string> = {
  disponible: 'check_circle', occupe: 'pending', absent: 'cancel',
};
export function memberAvailabilityLabel(a: string): string { return (MEMBER_AVAILABILITY_LABELS as Record<string, string>)[a] ?? a; }
export function memberAvailabilityColor(a: string): string { return (MEMBER_AVAILABILITY_COLORS as Record<string, string>)[a] ?? '#64748b'; }
export function memberAvailabilityIcon(a: string): string { return (MEMBER_AVAILABILITY_ICONS as Record<string, string>)[a] ?? 'help'; }

export const MISSION_STATUS_LABELS: Record<MissionStatusV, string> = {
  brouillon: 'Brouillon', planifie: 'Planifié', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé',
};
export const MISSION_STATUS_COLORS: Record<MissionStatusV, string> = {
  brouillon: '#64748b', planifie: '#3b82f6', en_cours: '#f59e0b', termine: '#16a34a', annule: '#ef4444',
};
export function missionStatusLabel(s: string): string { return (MISSION_STATUS_LABELS as Record<string, string>)[s] ?? s; }
export function missionStatusColor(s: string): string { return (MISSION_STATUS_COLORS as Record<string, string>)[s] ?? '#94a3b8'; }

/** Couleur "plus haut = mieux" (taux de réussite), inverse de la charge de travail. */
export function successRateColor(pct: number): string {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}
