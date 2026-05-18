import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export function exportToExcel(data: any[], filename: string, title?: string) {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'СИ')
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })
  saveAs(blob, `${filename}.xlsx`)
}

export function exportToWord(data: any[], columns: string[], filename: string, title?: string) {
  let html = `<html><head><meta charset="UTF-8"><title>${filename}</title></head><body>`
  html += `<h1>${filename}</h1>`
  html += `<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">`
  html += `<thead><tr>${columns.map((col) => `<th>${col}</th>`).join('')}</tr></thead><tbody>`
  for (const row of data) {
    html += `<tr>${columns.map((col) => `<td>${row[col] || ''}</td>`).join('')}</tr>`
  }
  html += `</tbody></table></body></html>`
  const blob = new Blob([html], { type: 'application/msword' })
  saveAs(blob, `${filename}.doc`)
}
