import api from './axiosInstance';

export const getSummary = () =>
  api.get('/analytics').then((r) => r.data);

export const getRiskScores = () =>
  api.get('/analytics/risk-scores').then((r) => r.data);
