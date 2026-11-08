import 'reflect-metadata';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { buildContainer, Container } from './composition-root';
import { buildApiRouter } from './interfaces/http/routes';
import { corsConfig, jsonConfig, urlEncodeConfig } from './shared/config/express.config';
import { env } from './shared/config/env';
import { errorHandler } from './shared/middlewares/error-handler.middleware';
import { swaggerSpec } from './swagger';

export const createApp = (container: Container = buildContainer()): Express => {
  const app = express();

  if (env.TRUST_PROXY !== undefined) {
    app.set('trust proxy', env.TRUST_PROXY);
  }

  app.use(helmet());
  app.use(cors(corsConfig));
  app.use(express.json(jsonConfig));
  app.use(express.urlencoded(urlEncodeConfig));
  app.use(morgan('dev'));

  app.use('/api', buildApiRouter(container));
  app.get('/api-docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(errorHandler);

  return app;
};
