import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Экспорт данных в формат Excel (.xlsx)
 * @param data - массив объектов для экспорта
 * @param filename - имя файла (без расширения)
 */
export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.warn('Нет данных для экспорта');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Данные');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, `${filename}.xlsx`);
}

/**
 * Экспорт данных в формат Word (.doc)
 * @param data - массив объектов для экспорта
 * @param headers - массив заголовков (ключей) для отображения в том же порядке
 * @param filename - имя файла (без расширения)
 */
export function exportToWord(data: any[], headers: string[], filename: string) {
  if (!data || data.length === 0) {
    console.warn('Нет данных для экспорта');
    return;
  }
  let html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>${filename}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; }
      h1 { color: #2c5f8a; }
      table { border-collapse: collapse; width: 100%; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
      th { background-color: #f2f2f2; }
    </style>
  </head>
  <body>
    <h1>${filename}</h1>
    <table>
      <thead>
        <tr>`;
  for (const h of headers) {
    html += `<th>${h}</th>`;
  }
  html += `</tr></thead><tbody>`;
  for (const row of data) {
    html += `<tr>`;
    for (const h of headers) {
      html += `<td>${row[h] ?? ''}</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table></body></html>`;
  const blob = new Blob([html], { type: 'application/msword' });
  saveAs(blob, `${filename}.doc`);
}