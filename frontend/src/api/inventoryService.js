import api from './axiosInstance';

export const getInventory = () =>
  api.get('/inventory').then((r) => r.data);

export const addInventoryItem = (data) =>
  api.post('/inventory', data).then((r) => r.data);

export const updateInventory = (id, data) =>
  api.patch(`/inventory/${id}`, data).then((r) => r.data);

export const getLowStockAlerts = () =>
  api.get('/inventory/low-stock').then((r) => r.data);
