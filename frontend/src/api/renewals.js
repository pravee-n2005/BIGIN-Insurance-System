import api from './axios';

export const fetchRenewalWorklist = ({ month, year } = {}) => {
  const params = {};
  if (month) params.month = month;
  if (year) params.year = year;
  return api.get('/renewals/worklist', { params }).then((r) => r.data);
};
