import { CredentialVerifier } from './modules/auth/application/credential-verifier';
import { LoginUseCase } from './modules/auth/application/login.use-case';
import { SignupUseCase } from './modules/auth/application/signup.use-case';
import { PasswordPolicy } from './modules/auth/domain/password-policy';
import { buildAuthRateLimiter } from './modules/auth/infrastructure/http/auth-rate-limiter';
import { AuthController } from './modules/auth/infrastructure/http/auth.controller';
import { buildAuthenticate } from './modules/auth/infrastructure/http/authenticate.middleware';
import { JwtTokenService } from './modules/auth/infrastructure/security/jwt-token.service';
import { PwnedPasswordChecker } from './modules/auth/infrastructure/security/pwned-password-checker';
import { ScryptPasswordHasher } from './modules/auth/infrastructure/security/scrypt-password-hasher';
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  FindAllCategoriesUseCase,
  FindCategoryByIdUseCase,
  UpdateCategoryUseCase,
} from './modules/category/application/category.use-cases';
import { CategoryRepository } from './modules/category/domain/category.repository';
import { CategoryController } from './modules/category/infrastructure/http/category.controller';
import { MongooseCategoryRepository } from './modules/category/infrastructure/persistence/mongoose-category.repository';
import {
  CreateOrderUseCase,
  DeleteOrderUseCase,
  FindOrderByIdUseCase,
  FindOrdersByUserUseCase,
  UpdateOrderUseCase,
} from './modules/order/application/order.use-cases';
import { OrderRepository } from './modules/order/domain/order.repository';
import { OrderController } from './modules/order/infrastructure/http/order.controller';
import { MongooseOrderRepository } from './modules/order/infrastructure/persistence/mongoose-order.repository';
import {
  CreateProductUseCase,
  DeleteProductUseCase,
  FindAllProductsUseCase,
  FindProductByIdUseCase,
  FindProductsByCategoryUseCase,
  UpdateProductUseCase,
} from './modules/product/application/product.use-cases';
import { ProductRepository } from './modules/product/domain/product.repository';
import { ProductController } from './modules/product/infrastructure/http/product.controller';
import { MongooseProductRepository } from './modules/product/infrastructure/persistence/mongoose-product.repository';
import { DeleteUserUseCase } from './modules/user/application/delete-user.use-case';
import { FindAllUsersUseCase } from './modules/user/application/find-all-users.use-case';
import { FindUserByIdUseCase } from './modules/user/application/find-user-by-id.use-case';
import { UpdateUserUseCase } from './modules/user/application/update-user.use-case';
import { UserRepository } from './modules/user/domain/user.repository';
import { UserController } from './modules/user/infrastructure/http/user.controller';
import { MongooseUserRepository } from './modules/user/infrastructure/persistence/mongoose-user.repository';
import { env } from './shared/config/env';

export interface Repositories {
  userRepository: UserRepository;
  categoryRepository: CategoryRepository;
  productRepository: ProductRepository;
  orderRepository: OrderRepository;
}

export const buildContainer = ({
  userRepository,
  categoryRepository,
  productRepository,
  orderRepository,
}: Repositories = {
  userRepository: new MongooseUserRepository(),
  categoryRepository: new MongooseCategoryRepository(),
  productRepository: new MongooseProductRepository(),
  orderRepository: new MongooseOrderRepository(),
}) => {
  const passwordHasher = new ScryptPasswordHasher(env.SCRYPT_LOG_N);
  const tokenService = new JwtTokenService(env.JWT_SECRET, env.JWT_EXPIRES_IN_SECONDS);
  const passwordPolicy = new PasswordPolicy(env.PWNED_PASSWORDS_CHECK ? new PwnedPasswordChecker() : undefined);
  const credentialVerifier = new CredentialVerifier(userRepository, passwordHasher, {
    maxAttempts: env.LOGIN_MAX_ATTEMPTS,
    lockoutSeconds: env.LOGIN_LOCKOUT_SECONDS,
  });

  const authController = new AuthController(
    new SignupUseCase(userRepository, passwordHasher, passwordPolicy),
    new LoginUseCase(credentialVerifier, tokenService),
  );

  const userController = new UserController(
    new FindAllUsersUseCase(userRepository),
    new FindUserByIdUseCase(userRepository),
    new UpdateUserUseCase(userRepository),
    new DeleteUserUseCase(userRepository, orderRepository),
  );

  const categoryController = new CategoryController(
    new CreateCategoryUseCase(categoryRepository),
    new FindAllCategoriesUseCase(categoryRepository),
    new FindCategoryByIdUseCase(categoryRepository),
    new UpdateCategoryUseCase(categoryRepository),
    new DeleteCategoryUseCase(categoryRepository, productRepository),
    new FindProductsByCategoryUseCase(productRepository, categoryRepository),
  );

  const productController = new ProductController(
    new CreateProductUseCase(productRepository, categoryRepository),
    new FindAllProductsUseCase(productRepository),
    new FindProductByIdUseCase(productRepository),
    new UpdateProductUseCase(productRepository, categoryRepository),
    new DeleteProductUseCase(productRepository, orderRepository),
  );

  const orderController = new OrderController(
    new CreateOrderUseCase(orderRepository, productRepository),
    new FindOrdersByUserUseCase(orderRepository, userRepository),
    new FindOrderByIdUseCase(orderRepository),
    new UpdateOrderUseCase(orderRepository),
    new DeleteOrderUseCase(orderRepository),
  );

  return {
    authenticate: buildAuthenticate(tokenService, userRepository),
    authRateLimiter: buildAuthRateLimiter(env.AUTH_RATE_LIMIT_MAX),
    authController,
    userController,
    categoryController,
    productController,
    orderController,
  };
};

export type Container = ReturnType<typeof buildContainer>;
