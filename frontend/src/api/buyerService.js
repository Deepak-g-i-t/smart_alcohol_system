import api from './axiosInstance';

export const getBuyerProfile = (buyerId) =>
  api.get(`/buyers/${buyerId}/profile`).then((r) => r.data);

export const getBuyerQR = (buyerId) =>
  api.get(`/inventory/qr/${buyerId}`).then((r) => r.data);

export const toggleBlacklist = (buyerId) =>
  api.post(`/buyers/${buyerId}/blacklist`).then((r) => r.data);

export const getAllBuyers = () =>
  api.get('/buyers').then((r) => r.data);
