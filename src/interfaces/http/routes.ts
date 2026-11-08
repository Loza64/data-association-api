import { Router } from 'express';
import { Container } from '../../composition-root';
import { buildAuthRouter } from '../../modules/auth/infrastructure/http/auth.routes';
import { buildCategoryRouter } from '../../modules/category/infrastructure/http/category.routes';
import { buildOrderRouter } from '../../modules/order/infrastructure/http/order.routes';
import { buildProductRouter } from '../../modules/product/infrastructure/http/product.routes';
import { buildUserRouter } from '../../modules/user/infrastructure/http/user.routes';
import { noStore } from '../../shared/middlewares/no-store.middleware';

export const buildApiRouter = (container: Container): Router => {
  const router = Router();

  router.use(noStore);
  router.use('/auth', buildAuthRouter(container.authController, container.authRateLimiter));
  router.use('/users', container.authenticate, buildUserRouter(container.userController, container.orderController));
  router.use('/categories', container.authenticate, buildCategoryRouter(container.categoryController));
  router.use('/products', container.authenticate, buildProductRouter(container.productController));
  router.use('/orders', container.authenticate, buildOrderRouter(container.orderController));

  return router;
};
