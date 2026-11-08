import { NextFunction, Request, Response } from 'express';
import { buildPaginatedResponse } from '../../../../shared/pagination/paginate.util';
import { getAuthUserId } from '../../../auth/infrastructure/http/authenticate.middleware';
import { DeleteUserUseCase } from '../../application/delete-user.use-case';
import { FindAllUsersUseCase } from '../../application/find-all-users.use-case';
import { FindUserByIdUseCase } from '../../application/find-user-by-id.use-case';
import { UpdateUserUseCase } from '../../application/update-user.use-case';
import { UserQueryDto } from '../../application/user-query.dto';

export class UserController {
  constructor(
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, pageSize, search } = req.validatedQuery as UserQueryDto;
      const result = await this.findAllUsersUseCase.execute({ page, pageSize, search });
      res.status(200).json(buildPaginatedResponse(result, (user) => user.toPublic()));
    } catch (err) {
      next(err);
    }
  };

  findOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.findUserByIdUseCase.execute(String(req.params.id));
      res.status(200).json({ data: user.toPublic() });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.updateUserUseCase.execute(String(req.params.id), getAuthUserId(req), req.body);
      res.status(200).json({ data: user.toPublic() });
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteUserUseCase.execute(String(req.params.id), getAuthUserId(req));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
