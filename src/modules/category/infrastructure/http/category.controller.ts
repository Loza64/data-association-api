import { NextFunction, Request, Response } from 'express';
import { buildPaginatedResponse } from '../../../../shared/pagination/paginate.util';
import { SearchQueryDto } from '../../../../shared/pagination/pagination-query.dto';
import { FindProductsByCategoryUseCase } from '../../../product/application/product.use-cases';
import { presentProduct } from '../../../product/infrastructure/http/product.presenter';
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  FindAllCategoriesUseCase,
  FindCategoryByIdUseCase,
  UpdateCategoryUseCase,
} from '../../application/category.use-cases';

export class CategoryController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly findAllCategoriesUseCase: FindAllCategoriesUseCase,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly findProductsByCategoryUseCase: FindProductsByCategoryUseCase,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(201).json({ data: await this.createCategoryUseCase.execute(req.body) });
    } catch (err) {
      next(err);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, pageSize, search } = req.validatedQuery as SearchQueryDto;
      const result = await this.findAllCategoriesUseCase.execute({ page, pageSize, search });
      res.status(200).json(buildPaginatedResponse(result, (category) => category));
    } catch (err) {
      next(err);
    }
  };

  findOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ data: await this.findCategoryByIdUseCase.execute(String(req.params.id)) });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ data: await this.updateCategoryUseCase.execute(String(req.params.id), req.body) });
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteCategoryUseCase.execute(String(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  findProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, pageSize, search } = req.validatedQuery as SearchQueryDto;
      const result = await this.findProductsByCategoryUseCase.execute(String(req.params.id), { page, pageSize, search });
      res.status(200).json(buildPaginatedResponse(result, presentProduct));
    } catch (err) {
      next(err);
    }
  };
}
