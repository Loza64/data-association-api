import { NextFunction, Request, Response } from 'express';
import { LoginUseCase } from '../../application/login.use-case';
import { SignupUseCase } from '../../application/signup.use-case';

export class AuthController {
  constructor(
    private readonly signupUseCase: SignupUseCase,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.signupUseCase.execute(req.body);
      res.status(201).json({ data: user.toPublic() });
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user, accessToken, expiresIn } = await this.loginUseCase.execute(req.body);
      res.status(200).json({
        data: { accessToken, tokenType: 'Bearer', expiresIn, user: user.toPublic() },
      });
    } catch (err) {
      next(err);
    }
  };
}
