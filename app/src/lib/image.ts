import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface CompressedPhoto {
  uri: string;
  base64: string;
}

// Las fotos de cámaras modernas pesan varios MB; se reduce a un ancho
// razonable para reconocimiento por IA y se comprime. Se pide el base64 en la
// misma llamada nativa porque las fotos viajan al backend en el cuerpo JSON
// (no como multipart/FormData: eso falla en Android bajo la New Architecture
// de React Native con "Unsupported FormData part implementation" — ver lib/items.ts).
export async function compressPhoto(uri: string): Promise<CompressedPhoto> {
  const result = await manipulateAsync(uri, [{ resize: { width: 1280 } }], {
    compress: 0.6,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) {
    throw new Error('No se pudo procesar la foto');
  }
  return { uri: result.uri, base64: result.base64 };
}

export function compressPhotos(uris: string[]): Promise<CompressedPhoto[]> {
  return Promise.all(uris.map(compressPhoto));
}

// Bug conocido de cámara en Android: el buffer de píxeles a veces no viene
// rotado según la orientación real del teléfono (una foto horizontal se
// guarda como si fuera vertical y viceversa), aunque el EXIF sí trae el tag
// correcto. Se corrige aquí, justo tras tomar la foto, para que el resto del
// flujo (preview, compressPhoto, subida) ya trabaje con la imagen bien orientada.
const EXIF_ROTATION_DEGREES: Record<number, number> = { 3: 180, 6: 90, 8: 270 };

export async function normalizeCameraOrientation(uri: string, exif?: { Orientation?: number } | null): Promise<string> {
  const rotation = exif?.Orientation ? EXIF_ROTATION_DEGREES[exif.Orientation] : undefined;
  if (!rotation) return uri;
  const result = await manipulateAsync(uri, [{ rotate: rotation }], { format: SaveFormat.JPEG });
  return result.uri;
}
