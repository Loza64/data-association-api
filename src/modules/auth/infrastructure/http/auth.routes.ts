import { RequestHandler, Router } from 'express';
import { validateDTO } from '../../../../shared/middlewares/validate-dto.middleware';
import { LoginDto } from '../../application/login.dto';
import { SignupDto } from '../../application/signup.dto';
import { AuthController } from './auth.controller';

export const buildAuthRouter = (
  controller: AuthController,
  rateLimiter: RequestHandler,
): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/auth/signup:
   *   post:
   *     summary: Registra un usuario
   *     description: La contraseña no tiene reglas de composición; se exige una longitud mínima (por defecto 15) y se rechazan contraseñas comunes, predecibles, que contengan tus datos o que aparezcan en filtraciones conocidas.
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SignupDto'
   *     responses:
   *       201:
   *         description: Usuario creado
   *       400:
   *         description: Error de validación o contraseña no aceptable
   *       409:
   *         description: El nombre de usuario ya está en uso
   *       429:
   *         description: Demasiadas solicitudes desde esta dirección
   */
  router.post('/signup', rateLimiter, validateDTO(SignupDto), controller.signup);

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Inicia sesión y devuelve un token JWT
   *     description: Cualquier fallo (usuario inexistente, contraseña incorrecta o cuenta bloqueada por intentos fallidos) responde lo mismo, con el mismo código.
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginDto'
   *     responses:
   *       200:
   *         description: Token de acceso y datos del usuario
   *       400:
   *         description: Error de validación
   *       401:
   *         description: Credenciales inválidas
   *       429:
   *         description: Demasiadas solicitudes desde esta dirección
   */
  router.post('/login', rateLimiter, validateDTO(LoginDto), controller.login);

  return router;
};
