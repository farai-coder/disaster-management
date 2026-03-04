import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

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

export const classifyImage = (formData) =>
  api.post('/incidents/classify-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// --- Alerts ---
export const createAlert = (data, issuedBy) =>
  api.post(`/alerts/?issued_by=${issuedBy}`, data);

export const getAlerts = (params = {}) =>
  api.get('/alerts/', { params });

export const deactivateAlert = (id) =>
  api.patch(`/alerts/${id}/deactivate`);

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

export const UPLOAD_BASE = 'http://localhost:8000';
