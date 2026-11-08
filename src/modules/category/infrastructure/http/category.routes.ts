import { Router } from 'express';
import { validateDTO } from '../../../../shared/middlewares/validate-dto.middleware';
import { validateObjectIdParam } from '../../../../shared/middlewares/validate-object-id-param.middleware';
import { validateQuery } from '../../../../shared/middlewares/validate-query.middleware';
import { CreateCategoryDto, UpdateCategoryDto } from '../../application/category.dto';
import { CategoryQueryDto } from '../../application/category-query.dto';
import { CategoryController } from './category.controller';

export const buildCategoryRouter = (controller: CategoryController): Router => {
  const router = Router();

  router.param('id', validateObjectIdParam);

  /**
   * @swagger
   * /api/categories:
   *   post:
   *     summary: Crea una categoría
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateCategoryDto'
   *     responses:
   *       201:
   *         description: Categoría creada
   *       400:
   *         description: Error de validación
   *       401:
   *         description: Token ausente, inválido o expirado
   *       409:
   *         description: Ya existe una categoría con ese nombre (sin distinguir mayúsculas)
   */
  router.post('/', validateDTO(CreateCategoryDto), controller.create);

  /**
   * @swagger
   * /api/categories:
   *   get:
   *     summary: Lista categorías con el número de productos de cada una (paginado)
   *     tags: [Categories]
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
   *         description: Busca en name y description
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Listado paginado de categorías (productsCount calculado por virtual populate)
   *       400:
   *         description: Parámetros de consulta inválidos
   *       401:
   *         description: Token ausente, inválido o expirado
   */
  router.get('/', validateQuery(CategoryQueryDto), controller.findAll);

  /**
   * @swagger
   * /api/categories/{id}:
   *   get:
   *     summary: Obtiene una categoría con su número de productos
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Categoría encontrada
   *       400:
   *         description: Id inválido
   *       401:
   *         description: Token ausente, inválido o expirado
   *       404:
   *         description: Categoría no encontrada
   */
  router.get('/:id', controller.findOne);

  /**
   * @swagger
   * /api/categories/{id}/products:
   *   get:
   *     summary: Lista los productos de una categoría (paginado)
   *     tags: [Categories]
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
   *         name: search
   *         description: Busca en el nombre del producto
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Productos de la categoría, con la categoría poblada
   *       400:
   *         description: Parámetros inválidos
   *       401:
   *         description: Token ausente, inválido o expirado
   *       404:
   *         description: Categoría no encontrada
   */
  router.get('/:id/products', validateQuery(CategoryQueryDto), controller.findProducts);

  /**
   * @swagger
   * /api/categories/{id}:
   *   patch:
   *     summary: Actualiza una categoría
   *     tags: [Categories]
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
   *             $ref: '#/components/schemas/UpdateCategoryDto'
   *     responses:
   *       200:
   *         description: Categoría actualizada
   *       400:
   *         description: Error de validación
   *       401:
   *         description: Token ausente, inválido o expirado
   *       404:
   *         description: Categoría no encontrada
   *       409:
   *         description: Ya existe una categoría con ese nombre
   */
  router.patch('/:id', validateDTO(UpdateCategoryDto), controller.update);

  /**
   * @swagger
   * /api/categories/{id}:
   *   delete:
   *     summary: Elimina una categoría sin productos
   *     description: Relación restrictiva; se rechaza con 409 si la categoría tiene productos asociados.
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       204:
   *         description: Categoría eliminada
   *       401:
   *         description: Token ausente, inválido o expirado
   *       404:
   *         description: Categoría no encontrada
   *       409:
   *         description: La categoría tiene productos asociados
   */
  router.delete('/:id', controller.remove);

  return router;
};
