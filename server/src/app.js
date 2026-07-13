import express from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { requestId } from './middleware/requestId.js';
import { responseFormatter } from './middleware/responseFormatter.js';
import { securityMiddleware } from './middlewares/security.js';
import router from './routes/index.js';

const app = express();

securityMiddleware(app);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(requestId);
app.use(requestLogger);
app.use(responseFormatter);

app.use('/api', router);

app.use(notFound);
app.use(errorHandler);

export default app;
