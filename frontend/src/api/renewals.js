import api from './axios';

export const fetchRenewalWorklist = () =>
  api.get('/renewals/worklist').then((r) => r.data);
