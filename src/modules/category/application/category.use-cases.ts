import { definedOnly } from '../../../shared/utils/defined';
import { AppError } from '../../../shared/errors/AppError';
import { ListParams, Page } from '../../../shared/pagination/pagination.types';
import { ProductRepository } from '../../product/domain/product.repository';
import { Category } from '../domain/category.entity';
import { CategoryRepository } from '../domain/category.repository';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';

export class CreateCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  execute(input: CreateCategoryDto): Promise<Category> {
    return this.categoryRepository.create({ name: input.name, description: input.description ?? '' });
  }
}

export class FindAllCategoriesUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  execute(params: ListParams): Promise<Page<Category>> {
    return this.categoryRepository.findAll(params);
  }
}

export class FindCategoryByIdUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new AppError('Categoría no encontrada', 404);
    }
    return category;
  }
}

export class UpdateCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(id: string, input: UpdateCategoryDto): Promise<Category> {
    if (input.name === undefined && input.description === undefined) {
      throw new AppError('Debes enviar al menos un campo para actualizar (name o description)', 400);
    }

    const updated = await this.categoryRepository.update(id, definedOnly(input));
    if (!updated) {
      throw new AppError('Categoría no encontrada', 404);
    }
    return updated;
  }
}

export class DeleteCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(id: string): Promise<void> {
    if (!(await this.categoryRepository.exists(id))) {
      throw new AppError('Categoría no encontrada', 404);
    }

    if ((await this.productRepository.countByCategory(id)) > 0) {
      throw new AppError('No se puede eliminar una categoría que tiene productos asociados', 409);
    }

    await this.categoryRepository.delete(id);
  }
}
