'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col items-center justify-center gap-4 bg-[#16122b] text-[#f5f0e6]">
        <p className="text-lg font-semibold">Ocurrió un error inesperado</p>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-[#c6f432] px-4 py-2 text-sm font-medium text-[#16122b]"
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
