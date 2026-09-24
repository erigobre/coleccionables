import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Grant manual de FT para pruebas/soporte (SUPERADMIN only). Tope de 1000 para
// que un typo no infle una cuenta de forma descontrolada.
export class GrantFtDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  amount?: number;
}
