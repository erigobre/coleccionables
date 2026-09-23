import { useCallback, useState } from 'react';

// Envuelve cualquier llamada que consulte IA (Analizar, ¿Ya lo tengo?, Obtener
// precio) para mostrar el overlay de proceso (AIProcessingOverlay): al llamar
// `run`, `visible` pasa a true de inmediato y `done` a true cuando la promesa
// resuelve (dispara el fade-out con "¡Proceso finalizado!"). Si la promesa
// falla, el overlay se oculta al instante (sin el mensaje de éxito) para que
// el error se muestre con la UI normal de la pantalla.
export function useAiProcessing() {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);

  const run = useCallback(async <T,>(task: () => Promise<T>): Promise<T> => {
    setDone(false);
    setVisible(true);
    try {
      const result = await task();
      setDone(true);
      return result;
    } catch (err) {
      setVisible(false);
      setDone(false);
      throw err;
    }
  }, []);

  const onHidden = useCallback(() => {
    setVisible(false);
    setDone(false);
  }, []);

  return { visible, done, run, onHidden };
}
