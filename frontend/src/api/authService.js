import api from './axiosInstance';

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const register = (userData) =>
  api.post('/auth/register', userData).then((r) => r.data);

export const sendOtp = (email) =>
  api.post('/auth/send-otp', { email }).then((r) => r.data);

export const verifyOtp = (email, otp) =>
  api.post('/auth/verify-otp', { email, otp }).then((r) => r.data);
