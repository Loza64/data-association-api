import { NextFunction, Request, Response } from 'express';
import { buildPaginatedResponse } from '../../../../shared/pagination/paginate.util';
import { getAuthUserId } from '../../../auth/infrastructure/http/authenticate.middleware';
import { presentOrder } from './order.presenter';
import { OrderQueryDto } from '../../application/order-query.dto';
import {
  CreateOrderUseCase,
  DeleteOrderUseCase,
  FindOrderByIdUseCase,
  FindOrdersByUserUseCase,
  UpdateOrderUseCase,
} from '../../application/order.use-cases';

export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly findOrdersByUserUseCase: FindOrdersByUserUseCase,
    private readonly findOrderByIdUseCase: FindOrderByIdUseCase,
    private readonly updateOrderUseCase: UpdateOrderUseCase,
    private readonly deleteOrderUseCase: DeleteOrderUseCase,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(201).json({ data: presentOrder(await this.createOrderUseCase.execute(getAuthUserId(req), req.body)) });
    } catch (err) {
      next(err);
    }
  };

  findMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const { page, pageSize, status } = req.validatedQuery as OrderQueryDto;
      const result = await this.findOrdersByUserUseCase.execute(userId, userId, { page, pageSize, status });
      res.status(200).json(buildPaginatedResponse(result, presentOrder));
    } catch (err) {
      next(err);
    }
  };

  findByUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, pageSize, status } = req.validatedQuery as OrderQueryDto;
      const result = await this.findOrdersByUserUseCase.execute(String(req.params.id), getAuthUserId(req), {
        page,
        pageSize,
        status,
      });
      res.status(200).json(buildPaginatedResponse(result, presentOrder));
    } catch (err) {
      next(err);
    }
  };

  findOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ data: presentOrder(await this.findOrderByIdUseCase.execute(String(req.params.id), getAuthUserId(req))) });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.updateOrderUseCase.execute(String(req.params.id), getAuthUserId(req), req.body);
      res.status(200).json({ data: presentOrder(order) });
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteOrderUseCase.execute(String(req.params.id), getAuthUserId(req));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
