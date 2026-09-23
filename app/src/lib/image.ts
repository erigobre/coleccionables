import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Las fotos de cámaras modernas pesan varios MB; sin comprimir, la subida
// multipart puede fallar en ciertos dispositivos/redes antes de llegar al
// servidor (se ve como "no se pudo conectar" sin que el backend reciba nada).
// Se reduce a un ancho razonable para reconocimiento por IA y se comprime.
export async function compressPhoto(uri: string): Promise<string> {
  try {
    const result = await manipulateAsync(uri, [{ resize: { width: 1280 } }], {
      compress: 0.6,
      format: SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri;
  }
}

export function compressPhotos(uris: string[]): Promise<string[]> {
  return Promise.all(uris.map(compressPhoto));
}
