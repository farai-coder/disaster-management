import axios from 'axios';

const API_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
// In production VITE_API_BASE_URL is baked in at build time (e.g. https://api.disaster.shopivell.com).
// Locally it falls back to the dev backend on :8000.
const API_ROOT = import.meta.env.VITE_API_BASE_URL || `http://${API_HOST}:8000`;
const API_BASE = `${API_ROOT}/api`;

const api = axios.create({
  baseURL: API_BASE,
});

// --- Incidents ---
export const createIncident = (formData) =>
  api.post('/incidents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getIncidents = (params = {}) =>
  api.get('/incidents/', { params });

export const getIncident = (id) =>
  api.get(`/incidents/${id}`);

export const updateIncident = (id, data) =>
  api.patch(`/incidents/${id}`, data);

export const deleteIncident = (id) =>
  api.delete(`/incidents/${id}`);

// --- Alerts ---
export const createAlert = (data, issuedBy) =>
  api.post(`/alerts/?issued_by=${issuedBy}`, data);

export const getAlerts = (params = {}) =>
  api.get('/alerts/', { params });

export const deactivateAlert = (id) =>
  api.patch(`/alerts/${id}/deactivate`);

export const deleteAlert = (id) =>
  api.delete(`/alerts/${id}`);

export const getNearestAuthorities = (incidentId, limit = 5) =>
  api.get(`/incidents/${incidentId}/nearest-authorities`, { params: { limit } });

export const getNearestOffices = (lat, lon, authorityType, limit = 5) =>
  api.get('/authorities/offices/nearest', { params: { lat, lon, authority_type: authorityType, limit } });

export const submitResponderReport = (incidentId, payload) =>
  api.post(`/incidents/${incidentId}/reports`, payload);

export const getIncidentReports = (incidentId) =>
  api.get(`/incidents/${incidentId}/reports`);

// --- Authorities ---
export const loginAuthority = (data) =>
  api.post('/authorities/login', data);

export const registerAuthority = (data) =>
  api.post('/authorities/register', data);

export const getDashboardStats = (authorityType) =>
  api.get('/authorities/dashboard/stats', {
    params: authorityType ? { authority_type: authorityType } : {},
  });

export const getNotifications = (authorityType, unreadOnly = true) =>
  api.get('/authorities/notifications', {
    params: { authority_type: authorityType, unread_only: unreadOnly },
  });

export const markNotificationRead = (id) =>
  api.patch(`/authorities/notifications/${id}/read`);

export const UPLOAD_BASE = API_ROOT;
