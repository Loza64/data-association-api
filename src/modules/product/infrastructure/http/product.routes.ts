import { Router } from 'express';
import { validateDTO } from '../../../../shared/middlewares/validate-dto.middleware';
import { validateObjectIdParam } from '../../../../shared/middlewares/validate-object-id-param.middleware';
import { validateQuery } from '../../../../shared/middlewares/validate-query.middleware';
import { ProductQueryDto } from '../../application/product-query.dto';
import { CreateProductDto, UpdateProductDto } from '../../application/product.dto';
import { ProductController } from './product.controller';

export const buildProductRouter = (controller: ProductController): Router => {
  const router = Router();

  router.param('id', validateObjectIdParam);

  /**
   * @swagger
   * /api/products:
   *   post:
   *     summary: Crea un producto asociado a una categoría existente
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateProductDto'
   *     responses:
   *       201:
   *         description: Producto creado, con la categoría poblada
   *       400:
   *         description: Error de validación o categoryId inexistente
   *       401:
   *         description: Token ausente, inválido o expirado
   */
  router.post('/', validateDTO(CreateProductDto), controller.create);

  /**
   * @swagger
   * /api/products:
   *   get:
   *     summary: Lista productos con su categoría poblada (paginado)
   *     tags: [Products]
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
   *         description: Busca en el nombre
   *         schema: { type: string }
   *       - in: query
   *         name: categoryId
   *         description: Filtra por categoría
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Listado paginado de productos
   *       400:
   *         description: Parámetros de consulta inválidos
   *       401:
   *         description: Token ausente, inválido o expirado
   */
  router.get('/', validateQuery(ProductQueryDto), controller.findAll);

  /**
   * @swagger
   * /api/products/{id}:
   *   get:
   *     summary: Obtiene un producto con su categoría
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Producto encontrado
   *       400:
   *         description: Id inválido
   *       401:
   *         description: Token ausente, inválido o expirado
   *       404:
   *         description: Producto no encontrado
   */
  router.get('/:id', controller.findOne);

  /**
   * @swagger
   * /api/products/{id}:
   *   patch:
   *     summary: Actualiza un producto (incluida su categoría)
   *     description: Cambiar el precio no modifica las órdenes ya creadas, que guardan el precio con el que se compró.
   *     tags: [Products]
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
   *             $ref: '#/components/schemas/UpdateProductDto'
   *     responses:
   *       200:
   *         description: Producto actualizado
   *       400:
   *         description: Error de validación o categoryId inexistente
   *       401:
   *         description: Token ausente, inválido o expirado
   *       404:
   *         description: Producto no encontrado
   */
  router.patch('/:id', validateDTO(UpdateProductDto), controller.update);

  /**
   * @swagger
   * /api/products/{id}:
   *   delete:
   *     summary: Elimina un producto que no esté en ninguna orden
   *     description: Relación restrictiva; si el producto aparece en órdenes se rechaza con 409 y se recomienda desactivarlo.
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       204:
   *         description: Producto eliminado
   *       401:
   *         description: Token ausente, inválido o expirado
   *       404:
   *         description: Producto no encontrado
   *       409:
   *         description: El producto aparece en órdenes
   */
  router.delete('/:id', controller.remove);

  return router;
};
