import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import { buildSwaggerDefinitions } from './shared/swagger/schemas';

const routesGlob = path
  .join(__dirname, 'modules', '**', 'infrastructure', 'http', '*.routes.{ts,js}')
  .replace(/\\/g, '/');

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      version: 'v1.0.0',
      title: 'Data Association API',
      description: 'API REST con relaciones entre Users, Orders, Products y Categories (Mongoose populate), con registro e inicio de sesión JWT.',
    },
    servers: [{ url: '/' }],
    components: {
      schemas: buildSwaggerDefinitions(),
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: [routesGlob],
  failOnErrors: true,
};

export const swaggerSpec = swaggerJsdoc(options);
