import { 
  Equipment, 
  EquipmentFormData, 
  MaintenanceTeam, 
  TeamFormData, 
  MaintenanceRequest, 
  RequestFormData,
  CalendarEvent,
  PaginatedResponse,
  RequestStatus,
  User
} from '@/types';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Ensure trailing slash only if no query parameters
    let url: string;
    if (endpoint.includes('?')) {
      // Has query params - don't add trailing slash
      url = `${API_BASE_URL}${endpoint}`;
    } else {
      // No query params - ensure trailing slash
      url = endpoint.endsWith('/') 
        ? `${API_BASE_URL}${endpoint}` 
        : `${API_BASE_URL}${endpoint}/`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Equipment endpoints
  async getEquipment(page = 1): Promise<PaginatedResponse<Equipment>> {
    return this.request(`/equipment/?page=${page}`);
  }

  async getEquipmentById(id: number): Promise<Equipment> {
    return this.request(`/equipment/${id}/`);
  }

  async createEquipment(data: EquipmentFormData): Promise<Equipment> {
    return this.request('/equipment/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEquipment(id: number, data: Partial<EquipmentFormData>): Promise<Equipment> {
    return this.request(`/equipment/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteEquipment(id: number): Promise<void> {
    return this.request(`/equipment/${id}/`, {
      method: 'DELETE',
    });
  }

  async getEquipmentRequests(equipmentId: number): Promise<MaintenanceRequest[]> {
    return this.request(`/equipment/${equipmentId}/requests/`);
  }

  // Teams endpoints
  async getTeams(): Promise<MaintenanceTeam[]> {
    const response = await this.request<PaginatedResponse<MaintenanceTeam> | MaintenanceTeam[]>('/teams/');
    // Handle both paginated and non-paginated responses
    if (response && typeof response === 'object' && 'results' in response) {
      return response.results;
    }
    return response as MaintenanceTeam[];
  }

  async getTeamById(id: number): Promise<MaintenanceTeam> {
    return this.request(`/teams/${id}/`);
  }

  async createTeam(data: TeamFormData): Promise<MaintenanceTeam> {
    return this.request('/teams/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id: number, data: Partial<TeamFormData>): Promise<MaintenanceTeam> {
    return this.request(`/teams/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id: number): Promise<void> {
    return this.request(`/teams/${id}/`, {
      method: 'DELETE',
    });
  }

  // Users endpoint (for team member selection)
  async getUsers(): Promise<User[]> {
    return this.request('/users/');
  }

  // Maintenance Requests endpoints
  async getRequests(params?: {
    page?: number;
    status?: RequestStatus;
    request_type?: string;
    equipment?: number;
  }): Promise<PaginatedResponse<MaintenanceRequest>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.request_type) searchParams.set('request_type', params.request_type);
    if (params?.equipment) searchParams.set('equipment', String(params.equipment));
    
    const query = searchParams.toString();
    return this.request(`/requests/${query ? `?${query}` : ''}`);
  }

  async getRequestById(id: number): Promise<MaintenanceRequest> {
    return this.request(`/requests/${id}/`);
  }

  async createRequest(data: RequestFormData): Promise<MaintenanceRequest> {
    return this.request('/requests/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRequest(id: number, data: Partial<RequestFormData>): Promise<MaintenanceRequest> {
    return this.request(`/requests/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteRequest(id: number): Promise<void> {
    return this.request(`/requests/${id}/`, {
      method: 'DELETE',
    });
  }

  // Status update - MUST use dedicated endpoint
  async updateRequestStatus(id: number, status: RequestStatus): Promise<MaintenanceRequest> {
    return this.request(`/requests/${id}/status/`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  // Assign technician
  async assignTechnician(requestId: number, technicianId: number): Promise<MaintenanceRequest> {
    return this.request(`/requests/${requestId}/assign/`, {
      method: 'POST',
      body: JSON.stringify({ technician: technicianId }),
    });
  }

  // Calendar endpoint - returns only PREVENTIVE requests
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return this.request('/calendar/');
  }
}

// Custom error class for API errors
export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(status: number, errors: Record<string, string[]>) {
    super(`API Error: ${status}`);
    this.status = status;
    this.errors = errors;
    this.name = 'ApiError';
  }

  getFieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }

  getAllErrors(): string[] {
    return Object.values(this.errors).flat();
  }
}

export const api = new ApiClient();
