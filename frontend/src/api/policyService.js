import api from './axiosInstance';

export const getCurrentPolicy = () =>
  api.get('/policies').then((r) => r.data);

export const updatePolicy = (data) =>
  api.put('/policies', data).then((r) => r.data);

export const toggleEmergency = (flag) =>
  api.patch('/policies/emergency', { emergency_flag: flag }).then((r) => r.data);

export const getPolicyHistory = () =>
  api.get('/policies/history').then((r) => r.data);
