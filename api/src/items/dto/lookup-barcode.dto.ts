import { Matches } from 'class-validator';

// Solo dígitos (EAN-8/UPC-E/UPC-A/EAN-13/ITF-14): el valor termina dentro de un
// prompt, y un QR arbitrario podría traer instrucciones, así que nunca se acepta texto libre.
export class LookupBarcodeDto {
  @Matches(/^\d{8,14}$/, { message: 'El código de barras debe tener entre 8 y 14 dígitos' })
  barcode!: string;
}
