import api from './axiosInstance';

export const getBuyerProfile = (buyerId) =>
  api.get(`/buyers/${buyerId}/profile`).then((r) => r.data);

export const getBuyerQR = (buyerId) =>
  api.get(`/buyers/${buyerId}/qr`).then((r) => r.data);

export const getBuyerByCode = (buyerCode) =>
  api.get(`/buyers/by-code/${buyerCode}`).then((r) => r.data);

export const verifyQR = (qrToken) =>
  api.post('/buyers/qr/verify', { qrToken }).then((r) => r.data);

export const toggleBlacklist = (buyerId) =>
  api.post(`/buyers/${buyerId}/blacklist`).then((r) => r.data);

export const getAllBuyers = () =>
  api.get('/buyers').then((r) => r.data);
