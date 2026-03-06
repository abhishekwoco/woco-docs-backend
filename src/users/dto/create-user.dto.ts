export class CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: { dev: boolean; cs: boolean };
  admin: boolean;
  write?: { dev: boolean; cs: boolean };
}
