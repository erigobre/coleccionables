import { IsIn } from 'class-validator';

// "cached" reusa el último resultado guardado (barato, MARKET_PRICE_CACHED);
// "fresh" vuelve a preguntarle a Gemini (MARKET_PRICE_FRESH). La app siempre
// debe mandar uno de los dos explícitamente: no hay default silencioso porque
// cambia cuánto se le cobra al usuario.
export class LookupMarketPriceDto {
  @IsIn(['cached', 'fresh'])
  mode!: 'cached' | 'fresh';
}
