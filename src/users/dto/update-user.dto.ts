export class UpdateUserDto {
  name?: string;
  role?: { dev: boolean; cs: boolean };
  admin?: boolean;
  write?: { dev: boolean; cs: boolean };
}
