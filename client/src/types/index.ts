// Core entity types matching backend contract exactly

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Equipment {
  id: number;
  name: string;
  serial_number: string;
  department_or_owner: string;
  location: string;
  purchase_date: string; // YYYY-MM-DD
  warranty_end: string | null; // YYYY-MM-DD
  default_team: number | null;
  default_technician: number | null;
  default_team_name: string | null;
  default_technician_name: string | null;
  is_usable: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquipmentFormData {
  name: string;
  serial_number: string;
  department_or_owner: string;
  location: string;
  purchase_date: string;
  warranty_end?: string | null;
  default_team?: number | null;
  default_technician?: number | null;
  is_usable: boolean;
}

export interface MaintenanceTeam {
  id: number;
  name: string;
  member_ids: number[];
  members: User[];
  created_at: string;
  updated_at: string;
}

export interface TeamFormData {
  name: string;
  member_ids: number[];
}

export type RequestStatus = 'NEW' | 'IN_PROGRESS' | 'REPAIRED' | 'SCRAP';
export type RequestType = 'PREVENTIVE' | 'CORRECTIVE';

export interface MaintenanceRequest {
  id: number;
  subject: string;
  equipment: number;
  equipment_name?: string;
  request_type: RequestType;
  status: RequestStatus;
  scheduled_date: string; // ISO 8601 with timezone
  duration: string; // HH:MM:SS
  team: number | null;
  team_name?: string | null;
  technician: number | null;
  technician_name?: string | null;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface RequestFormData {
  subject: string;
  equipment: number;
  request_type: RequestType;
  scheduled_date: string;
  duration: string;
  technician?: number | null;
  team?: number | null;
}

export interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  request_id: number;
}

// Status workflow - valid transitions
export const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  NEW: ['IN_PROGRESS'],
  IN_PROGRESS: ['REPAIRED', 'SCRAP'],
  REPAIRED: ['SCRAP'],
  SCRAP: [],
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  REPAIRED: 'Repaired',
  SCRAP: 'Scrap',
};

export const TYPE_LABELS: Record<RequestType, string> = {
  PREVENTIVE: 'Preventive',
  CORRECTIVE: 'Corrective',
};

// Pagination response
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// API Error response
export interface ApiError {
  [field: string]: string[];
}
