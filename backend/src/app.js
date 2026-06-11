const express = require('express');
const healthRouter = require('./routes/health');
const authRouter = require('./modules/auth/auth.routes');
const policyRouter = require('./modules/policy/policy.routes');
const reportRouter = require('./modules/report/report.routes');
const pdfRouter = require('./modules/pdf/pdf.routes');
const importRouter = require('./modules/import/import.routes');
const mastersRouter = require('./modules/masters/masters.routes');
const invoiceProfileRouter = require('./modules/invoice-profile/invoice-profile.routes');
const invoiceRouter = require('./modules/invoice/invoice.routes');
const statementRouter = require('./modules/statement/statement.routes');
const incentiveRouter = require('./modules/incentive/incentive.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/policies', policyRouter);
app.use('/api/reports', reportRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/import', importRouter);
app.use('/api/masters', mastersRouter);
app.use('/api/invoice-profiles', invoiceProfileRouter);
app.use('/api/invoices', invoiceRouter);
app.use('/api/statements', statementRouter);
app.use('/api/incentives', incentiveRouter);

app.use(errorHandler);

module.exports = app;
