import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// Edición manual de datos de un usuario desde el panel Superadmin (soporte /
// corrección de datos mal cargados). Deliberadamente NO incluye `role` ni
// `status`: el rol es sensible (podría crear/quitar superadmins por error) y
// el status ya tiene endpoints dedicados (suspend/reactivate) con su propia
// semántica de moderación.
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
