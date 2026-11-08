import { definedOnly } from '../../../shared/utils/defined';
import { AppError } from '../../../shared/errors/AppError';
import { Page } from '../../../shared/pagination/pagination.types';
import { CategoryRepository } from '../../category/domain/category.repository';
import { OrderRepository } from '../../order/domain/order.repository';
import { Product } from '../domain/product.entity';
import { ProductListParams, ProductRepository } from '../domain/product.repository';
import { CreateProductDto, UpdateProductDto } from './product.dto';

const CATEGORY_NOT_FOUND = 'category.id no corresponde a una categoría existente';

export class CreateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(input: CreateProductDto): Promise<Product> {
    if (!(await this.categoryRepository.exists(input.category.id))) {
      throw new AppError(CATEGORY_NOT_FOUND, 400);
    }

    return this.productRepository.create({
      name: input.name,
      description: input.description ?? '',
      price: input.price,
      isActive: input.isActive ?? true,
      categoryId: input.category.id,
    });
  }
}

export class FindAllProductsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  execute(params: ProductListParams): Promise<Page<Product>> {
    return this.productRepository.findAll(params);
  }
}

export class FindProductByIdUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new AppError('Producto no encontrado', 404);
    }
    return product;
  }
}

export class FindProductsByCategoryUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(categoryId: string, params: { page: number; pageSize: number; search?: string }): Promise<Page<Product>> {
    if (!(await this.categoryRepository.exists(categoryId))) {
      throw new AppError('Categoría no encontrada', 404);
    }
    return this.productRepository.findAll({ ...params, categoryId });
  }
}

export class UpdateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(id: string, input: UpdateProductDto): Promise<Product> {
    const { category, ...rest } = definedOnly(input);
    const changes = { ...rest, ...(category ? { categoryId: category.id } : {}) };
    if (Object.keys(changes).length === 0) {
      throw new AppError('Debes enviar al menos un campo para actualizar', 400);
    }

    if (changes.categoryId !== undefined && !(await this.categoryRepository.exists(changes.categoryId))) {
      throw new AppError(CATEGORY_NOT_FOUND, 400);
    }

    const updated = await this.productRepository.update(id, changes);
    if (!updated) {
      throw new AppError('Producto no encontrado', 404);
    }
    return updated;
  }
}

export class DeleteProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(id: string): Promise<void> {
    if (!(await this.productRepository.exists(id))) {
      throw new AppError('Producto no encontrado', 404);
    }

    if (await this.orderRepository.existsByProduct(id)) {
      throw new AppError('No se puede eliminar un producto que aparece en órdenes; desactívalo con isActive=false', 409);
    }

    await this.productRepository.delete(id);
  }
}
