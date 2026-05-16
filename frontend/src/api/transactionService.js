import api from './axiosInstance';

export const submitTransaction = (data) =>
  api.post('/transactions', data).then((r) => r.data);

export const getBuyerHistory = (buyerId) =>
  api.get(`/transactions/buyer/${buyerId}`).then((r) => r.data);

export const getShopHistory = (shopId) =>
  api.get(`/transactions/shop/${shopId}`).then((r) => r.data);

export const getAllTransactions = (params) =>
  api.get('/transactions', { params }).then((r) => r.data);

export const getRejectedTransactions = () =>
  api.get('/transactions/rejected').then((r) => r.data);
