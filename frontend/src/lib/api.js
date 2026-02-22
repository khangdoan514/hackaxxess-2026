import axios from 'axios';

// Use relative /api in dev so Vite proxies to backend (avoids CORS). Set VITE_API_URL in production.
const baseURL = (import.meta.env.VITE_API_URL ?? '').trim();

export const api = axios.create({
  baseURL: baseURL ? `${baseURL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Helper functions for common API calls
export const doctorAPI = {
  // Upload audio file
  uploadAudio: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/record/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Transcribe audio
  transcribeAudio: (uploadId) => 
    api.post('/record/transcribe', { upload_id: uploadId }),
  
  // Basic analysis
  analyzeTranscript: (transcript) => 
    api.post('/diagnosis/analyze', { transcript }),
  
  // Patient Twin generation
  generatePatientTwin: (transcript, patientId = null) => 
    api.post('/diagnosis/patient-twin', { transcript, patient_id: patientId }),
  
  // Confirm diagnosis
  confirmDiagnosis: (data) => 
    api.post('/diagnosis/confirm', data),
};

export const patientAPI = {
  getDashboard: (patientId) => 
    api.get(`/patient/${patientId}`),
};

export default api;