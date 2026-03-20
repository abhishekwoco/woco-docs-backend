import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  token: string;
  email: string;
  name: string;
  role: {
    dev: boolean;
    cs: boolean;
  };
  admin: boolean;
  write: {
    dev: boolean;
    cs: boolean;
  };
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
