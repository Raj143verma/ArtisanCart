import helmet from 'helmet';
import cors from 'cors';

export function securityMiddleware(app) {
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',') || true,
      credentials: true,
    }),
  );
}
