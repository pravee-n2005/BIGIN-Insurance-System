import api from './axios';

export const downloadPolicyImportTemplate = () =>
  api.get('/import/policies/template', { responseType: 'blob' }).then((r) => r.data);

export const previewPolicyImport = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/import/policies/preview', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const commitPolicyImport = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/import/policies/commit', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};
