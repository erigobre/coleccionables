import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import {
  Environment,
  SignedDataVerifier,
  VerificationException,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from '@apple/app-store-server-library';

// Root certs de Apple (https://www.apple.com/certificateauthority/), estáticos
// y públicos — se descargan una sola vez y se commitean, no hay nada que
// rotar por este lado. SignedDataVerifier los usa para validar la cadena de
// firma de cada JWS sin llamar a ningún servidor por cada compra.
const CERT_FILES = ['AppleRootCA-G3.cer', 'AppleRootCA-G2.cer'];

function loadRootCertificates(): Buffer[] {
  return CERT_FILES.map((file) => readFileSync(join(import.meta.dirname, 'certs', file)));
}

// StoreKit firma igual en Sandbox y Producción; la única forma de saber cuál
// corresponde a una transacción dada es intentar un entorno y, si la librería
// la rechaza por INVALID_ENVIRONMENT, reintentar con el otro (plan Fase 10,
// decisión §4.1) — así los testers de sandbox también funcionan en el mismo
// endpoint que producción.
//
// enableOnlineChecks (2do parámetro de SignedDataVerifier) se deja en false:
// con true, la librería hace una verificación OCSP por HTTP (puerto 80)
// contra los servidores de Apple por cada certificado de la cadena, con 30s
// de timeout cada una — si el host bloquea ese tráfico (bug real reportado
// 2026-10-21: una compra se quedaba "pensando" sin error ni timeout visible),
// se suman hasta ~2 minutos (2 entornos × 2 certs) antes de fallar. La
// validación de firma/cadena/bundle ID sigue aplicando igual sin esto; OCSP
// solo cubre el caso raro de un certificado intermedio revocado.
@Injectable()
export class AppleReceiptService {
  private readonly logger = new Logger(AppleReceiptService.name);
  private readonly bundleId = process.env.APPLE_BUNDLE_ID ?? 'com.frikidex.app';
  private readonly appAppleId = process.env.APPLE_APP_APPLE_ID ? Number(process.env.APPLE_APP_APPLE_ID) : undefined;
  private productionVerifier?: SignedDataVerifier;
  private sandboxVerifier?: SignedDataVerifier;

  private getVerifier(environment: Environment): SignedDataVerifier {
    const rootCertificates = loadRootCertificates();
    if (environment === Environment.PRODUCTION) {
      this.productionVerifier ??= new SignedDataVerifier(
        rootCertificates,
        false,
        Environment.PRODUCTION,
        this.bundleId,
        this.appAppleId,
      );
      return this.productionVerifier;
    }
    this.sandboxVerifier ??= new SignedDataVerifier(rootCertificates, false, Environment.SANDBOX, this.bundleId);
    return this.sandboxVerifier;
  }

  private async withEnvironmentFallback<T>(verify: (verifier: SignedDataVerifier) => Promise<T>): Promise<T> {
    try {
      return await verify(this.getVerifier(Environment.PRODUCTION));
    } catch (error) {
      if (error instanceof VerificationException) {
        this.logger.debug(`Verificación en PRODUCTION falló (${error.status}), reintentando en SANDBOX`);
        return verify(this.getVerifier(Environment.SANDBOX));
      }
      throw error;
    }
  }

  verifyTransaction(signedTransactionJws: string): Promise<JWSTransactionDecodedPayload> {
    return this.withEnvironmentFallback((verifier) => verifier.verifyAndDecodeTransaction(signedTransactionJws));
  }

  verifyNotification(signedPayload: string): Promise<ResponseBodyV2DecodedPayload> {
    return this.withEnvironmentFallback((verifier) => verifier.verifyAndDecodeNotification(signedPayload));
  }

  verifyRenewalInfo(signedRenewalInfo: string): Promise<JWSRenewalInfoDecodedPayload> {
    return this.withEnvironmentFallback((verifier) => verifier.verifyAndDecodeRenewalInfo(signedRenewalInfo));
  }
}
