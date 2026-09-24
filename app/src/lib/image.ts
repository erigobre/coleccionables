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

// manipulateAsync ya decodifica el JPEG respetando el tag EXIF Orientation y
// vuelve a codificar los píxeles ya derechos (por eso pasar por acá sin
// ninguna transformación alcanza para "hornear" la orientación correcta).
// Antes esta función además rotaba manualmente según el tag EXIF, pero eso
// duplicaba la corrección: una foto vertical ya derecha terminaba rotada 90°
// (se veía acostada) y una horizontal terminaba rotada 180° (se veía de cabeza).
export async function normalizeCameraOrientation(uri: string): Promise<string> {
  const result = await manipulateAsync(uri, [], { format: SaveFormat.JPEG });
  return result.uri;
}
