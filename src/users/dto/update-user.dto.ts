export class UpdateUserDto {
  name?: string;
  role?: { dev: boolean; cs: boolean };
  admin?: string;
}
