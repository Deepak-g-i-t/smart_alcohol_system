import api from './axiosInstance';

export const getSummaryReport = (from, to) =>
  api.get('/reports/summary', { params: { from, to } }).then((r) => r.data);

export const getAuditLogs = (params) =>
  api.get('/reports/audit-logs', { params }).then((r) => r.data);

export const exportCSV = (from, to) =>
  api.get('/reports/export', {
    params: { format: 'csv', from, to },
    responseType: 'blob',
  }).then((r) => r.data);

export const exportPDF = (from, to) =>
  api.get('/reports/export', {
    params: { format: 'json', from, to },
  }).then((r) => r.data);
