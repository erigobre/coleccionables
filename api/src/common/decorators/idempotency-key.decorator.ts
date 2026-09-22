import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

// FrikiTokens: toda acción que cobra FT debe traer esta llave (generada por el
// cliente y reenviada sin cambios si reintenta), para no cobrar 2 veces la
// misma acción ante un timeout de red (ver FtService.charge).
export const IdempotencyKey = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const key = request.headers['idempotency-key'];
  if (!key || typeof key !== 'string') {
    throw new BadRequestException('Falta el header Idempotency-Key');
  }
  return key;
});
