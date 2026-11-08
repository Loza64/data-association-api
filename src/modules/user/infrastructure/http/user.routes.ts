import { Router } from 'express';
import { validateDTO } from '../../../../shared/middlewares/validate-dto.middleware';
import { validateObjectIdParam } from '../../../../shared/middlewares/validate-object-id-param.middleware';
import { validateQuery } from '../../../../shared/middlewares/validate-query.middleware';
import { UpdateUserDto } from '../../application/update-user.dto';
import { UserQueryDto } from '../../application/user-query.dto';
import { OrderQueryDto } from '../../../order/application/order-query.dto';
import { OrderController } from '../../../order/infrastructure/http/order.controller';
import { UserController } from './user.controller';

export const buildUserRouter = (controller: UserController, orderController: OrderController): Router => {
  const router = Router();

  router.param('id', validateObjectIdParam);

  /**
   * @swagger
   * /api/users:
   *   get:
   *     summary: Lista usuarios (paginado)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: pageSize
   *         schema: { type: integer, default: 10 }
   *       - in: query
   *         name: search
   *         description: Busca en name y username
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Listado paginado de usuarios
   *       400:
   *         description: Parámetros de consulta inválidos
   *       401:
   *         description: Token ausente, inválido o expirado
   */
  router.get('/', validateQuery(UserQueryDto), controller.findAll);

  /**
   * @swagger
   * /api/users/{id}:
   *   get:
   *     summary: Obtiene un usuario
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, description: ObjectId del usuario }
   *     responses:
   *       200:
   *         description: Usuario encontrado
   *       400:
   *         description: Id inválido
   *       401:
   *         description: Token ausente, inválido o expirado
   *       404:
   *         description: Usuario no encontrado
   */
  router.get('/:id', controller.findOne);

  /**
   * @swagger
   * /api/users/{id}:
   *   patch:
   *     summary: Actualiza tu nombre o tu username
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateUserDto'
   *     responses:
   *       200:
   *         description: Usuario actualizado
   *       400:
   *         description: Error de validación
   *       401:
   *         description: Token ausente, inválido o expirado
   *       403:
   *         description: Solo puedes modificar tu propio usuario
   *       404:
   *         description: Usuario no encontrado
   *       409:
   *         description: El nombre de usuario ya está en uso
   */
  router.patch('/:id', validateDTO(UpdateUserDto), controller.update);

  /**
   * @swagger
   * /api/users/{id}:
   *   delete:
   *     summary: Elimina tu cuenta
   *     description: Se rechaza con 409 si el usuario tiene órdenes asociadas (relación restrictiva).
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       204:
   *         description: Cuenta eliminada
   *       401:
   *         description: Token ausente, inválido o expirado
   *       403:
   *         description: Solo puedes eliminar tu propio usuario
   *       404:
   *         description: Usuario no encontrado
   *       409:
   *         description: El usuario tiene órdenes asociadas
   */
  router.delete('/:id', controller.remove);

  /**
   * @swagger
   * /api/users/{id}/orders:
   *   get:
   *     summary: Lista tus órdenes con usuario, productos y categorías poblados (paginado)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: pageSize
   *         schema: { type: integer, default: 10 }
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [pending, completed, cancelled] }
   *     responses:
   *       200:
   *         description: Órdenes del usuario
   *       400:
   *         description: Parámetros inválidos
   *       401:
   *         description: Token ausente, inválido o expirado
   *       403:
   *         description: Solo puedes consultar tus propias órdenes
   *       404:
   *         description: Usuario no encontrado
   */
  router.get('/:id/orders', validateQuery(OrderQueryDto), orderController.findByUser);

  return router;
};
