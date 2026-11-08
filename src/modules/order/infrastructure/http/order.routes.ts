import { Router } from 'express';
import { validateDTO } from '../../../../shared/middlewares/validate-dto.middleware';
import { validateObjectIdParam } from '../../../../shared/middlewares/validate-object-id-param.middleware';
import { validateQuery } from '../../../../shared/middlewares/validate-query.middleware';
import { OrderQueryDto } from '../../application/order-query.dto';
import { CreateOrderDto, UpdateOrderDto } from '../../application/order.dto';
import { OrderController } from './order.controller';

export const buildOrderRouter = (controller: OrderController): Router => {
  const router = Router();

  router.param('id', validateObjectIdParam);

  /**
   * @swagger
   * /api/orders:
   *   post:
   *     summary: Crea una orden para el usuario autenticado
   *     description: Cada ítem guarda una copia del nombre y del precio del producto en el momento de la compra. El total se calcula en el servidor.
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateOrderDto'
   *     responses:
   *       201:
   *         description: Orden creada, con usuario, productos y categorías poblados
   *       400:
   *         description: Error de validación, productos repetidos o inexistentes
   *       401:
   *         description: Token ausente, inválido o expirado
   *       409:
   *         description: Algún producto no está disponible (isActive=false)
   */
  router.post('/', validateDTO(CreateOrderDto), controller.create);

  /**
   * @swagger
   * /api/orders:
   *   get:
   *     summary: Lista tus órdenes con usuario, productos y categorías poblados (paginado)
   *     tags: [Orders]
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
   *         name: status
   *         schema: { type: string, enum: [pending, completed, cancelled] }
   *     responses:
   *       200:
   *         description: Listado paginado de tus órdenes
   *       400:
   *         description: Parámetros de consulta inválidos
   *       401:
   *         description: Token ausente, inválido o expirado
   */
  router.get('/', validateQuery(OrderQueryDto), controller.findMine);

  /**
   * @swagger
   * /api/orders/{id}:
   *   get:
   *     summary: Obtiene una de tus órdenes
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Orden encontrada
   *       400:
   *         description: Id inválido
   *       401:
   *         description: Token ausente, inválido o expirado
   *       404:
   *         description: Orden no encontrada o de otro usuario
   */
  router.get('/:id', controller.findOne);

  /**
   * @swagger
   * /api/orders/{id}:
   *   patch:
   *     summary: Cambia el estado (completed o cancelled) o las notas de una orden pendiente
   *     tags: [Orders]
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
   *             $ref: '#/components/schemas/UpdateOrderDto'
   *     responses:
   *       200:
   *         description: Orden actualizada
   *       400:
   *         description: Error de validación
   *       401:
   *         description: Token ausente, inválido o expirado
   *       404:
   *         description: Orden no encontrada o de otro usuario
   *       409:
   *         description: La orden ya no está pendiente
   */
  router.patch('/:id', validateDTO(UpdateOrderDto), controller.update);

  /**
   * @swagger
   * /api/orders/{id}:
   *   delete:
   *     summary: Elimina una de tus órdenes que no esté completada
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       204:
   *         description: Orden eliminada
   *       401:
   *         description: Token ausente, inválido o expirado
   *       404:
   *         description: Orden no encontrada o de otro usuario
   *       409:
   *         description: La orden está completada
   */
  router.delete('/:id', controller.remove);

  return router;
};
