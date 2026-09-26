import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

// Regalo manual de FT a una organización desde el panel Superadmin, sin pago
// real de por medio — queda registrado como lote FtLotSource.PROMO (fuente ya
// prevista en el modelo para "regalo manual del superadmin") y en la
// bitácora de admin como una asignación tipo sponsor.
export class GrantFtDto {
  @IsInt()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
