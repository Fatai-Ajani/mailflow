import axios from 'axios';

let appPin = null;

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://mailflow-production-6068.up.railway.app',
  timeout: 10000
});

API.interceptors.request.use((config) => {
  if (appPin) config.headers['x-app-pin'] = appPin;
  return config;
});

export const setAppPin = (pin) => {
  appPin = pin || null;
};

// PIN verification
export const verifyPin = (pin) => API.post('/api/verify-pin', { pin });

// Accounts
export const getAccounts = () => API.get('/api/accounts');
export const getAuthUrl = () => API.get('/api/accounts/auth');
export const deleteAccount = (id) => API.delete(`/api/accounts/${id}`);
export const resetAccount = (id) => API.post(`/api/accounts/${id}/reset`);
export const pauseAccount = (id) => API.post(`/api/accounts/${id}/pause`);
export const resumeAccount = (id) => API.post(`/api/accounts/${id}/resume`);
export const updateDisplayName = (id, display_name) => API.put(`/api/accounts/${id}/display-name`, { display_name });
export const batchUpdateDisplayName = (account_ids, display_name) => API.post('/api/accounts/display-name/batch', { account_ids, display_name });
export const exportAccounts = () => API.get('/api/accounts/export');
export const importAccounts = (accounts) => API.post('/api/accounts/import', { accounts });

// Campaigns
export const getCampaigns = () => API.get('/api/campaigns');
export const getCampaign = (id) => API.get(`/api/campaigns/${id}`);
export const createCampaign = (data) => API.post('/api/campaigns', data);
export const launchCampaign = (id) => API.post(`/api/campaigns/${id}/launch`);
export const pauseCampaign = (id) => API.post(`/api/campaigns/${id}/pause`);
export const resumeCampaign = (id) => API.post(`/api/campaigns/${id}/resume`);
export const deleteCampaign = (id) => API.delete(`/api/campaigns/${id}`);

// Templates
export const getTemplates = () => API.get('/api/templates');
export const getTemplate = (id) => API.get(`/api/templates/${id}`);
export const createTemplate = (data) => API.post('/api/templates', data);
export const updateTemplate = (id, data) => API.put(`/api/templates/${id}`, data);
export const deleteTemplate = (id) => API.delete(`/api/templates/${id}`);
export const deleteTemplatesBulk = (ids) => API.post('/api/templates/delete-bulk', { ids });
export const importTemplates = (templates, batch_name) => API.post('/api/templates/import', { templates, batch_name });

// Contacts
export const getContactLists = () => API.get('/api/contacts/lists');
export const addManualContacts = (data) => API.post('/api/contacts/manual', data);
export const uploadCSV = (formData) => API.post('/api/contacts/upload', formData);
export const deleteContactList = (name) => API.delete(`/api/contacts/lists/${name}`);

// Queue & Stats
export const getQueue = () => API.get('/api/queue');
export const getStats = () => API.get('/api/queue/stats');

// Analytics
export const getAnalytics = () => API.get('/api/analytics');

// Dashboard
export const getDashboard = () => API.get('/api/dashboard');
