import pinoHttp from 'pino-http';
import { logger } from '../../config/logger';

export const requestLogger = pinoHttp({
  logger,
  // Custom request log level based on response status code
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Redact sensitive headers
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  // Custom serializers to keep output clean and avoid leaking data
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
