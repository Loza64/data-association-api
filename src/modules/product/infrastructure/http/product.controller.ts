import { NextFunction, Request, Response } from 'express';
import { buildPaginatedResponse } from '../../../../shared/pagination/paginate.util';
import { presentProduct } from './product.presenter';
import { ProductQueryDto } from '../../application/product-query.dto';
import {
  CreateProductUseCase,
  DeleteProductUseCase,
  FindAllProductsUseCase,
  FindProductByIdUseCase,
  UpdateProductUseCase,
} from '../../application/product.use-cases';

export class ProductController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly findAllProductsUseCase: FindAllProductsUseCase,
    private readonly findProductByIdUseCase: FindProductByIdUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(201).json({ data: presentProduct(await this.createProductUseCase.execute(req.body)) });
    } catch (err) {
      next(err);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, pageSize, search, categoryId } = req.validatedQuery as ProductQueryDto;
      const result = await this.findAllProductsUseCase.execute({ page, pageSize, search, categoryId });
      res.status(200).json(buildPaginatedResponse(result, presentProduct));
    } catch (err) {
      next(err);
    }
  };

  findOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ data: presentProduct(await this.findProductByIdUseCase.execute(String(req.params.id))) });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ data: presentProduct(await this.updateProductUseCase.execute(String(req.params.id), req.body)) });
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteProductUseCase.execute(String(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
