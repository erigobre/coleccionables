'use client';

import { Button } from '@/components/ui/button';

interface FtCostReportRow {
  userId: string | null;
  user: { id: string; name: string; username: string | null; email: string } | null;
  service: string | null;
  serviceLabel: string;
  calls: number;
  ftAmount: number;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  groundingRequests: number;
  realCostUsd: number;
  realCostMxn: number;
  avgRealCostUsdPerCall: number;
  ftPerUsd: number | null;
}

function csvCell(value: string | number) {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function userLabel(user: FtCostReportRow['user']) {
  if (!user) return '— (sin usuario)';
  return user.username ? `@${user.username}` : user.name;
}

// Botón para exportar la tabla ya cargada en la página a CSV sin pasar por el
// backend (pedido 2026-10-17): genera el archivo en el navegador a partir de
// las mismas filas que ya se renderizan, para poder compartir los datos del
// reporte sin copiar/pegar a mano.
export function DownloadCsvButton({ rows, from, to }: { rows: FtCostReportRow[]; from: string; to: string }) {
  const handleDownload = () => {
    const headers = [
      'Usuario',
      'Servicio',
      'Llamadas',
      'FT cobrados',
      'Tokens',
      'Búsquedas grounding',
      'Costo real (USD)',
      'Costo real (MXN)',
      'Promedio/llamada (USD)',
      'FT por $1 real',
    ];
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(
        [
          csvCell(userLabel(row.user)),
          csvCell(row.serviceLabel),
          csvCell(row.calls),
          csvCell(row.ftAmount),
          csvCell(row.totalTokens),
          csvCell(row.groundingRequests),
          csvCell(row.realCostUsd),
          csvCell(row.realCostMxn),
          csvCell(row.avgRealCostUsdPerCall),
          csvCell(row.ftPerUsd ?? ''),
        ].join(','),
      );
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `costos-ia_${from}_a_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button type="button" variant="outline" onClick={handleDownload}>
      Descargar CSV
    </Button>
  );
}
