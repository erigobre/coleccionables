import * as Clipboard from 'expo-clipboard';
import { useCallback, useRef, useState } from 'react';

export function useCopyFeedback() {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (value: string) => {
    await Clipboard.setStringAsync(value);
    setToast('Copiado');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 1200);
  }, []);

  return { toast, copy };
}
