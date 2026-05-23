<script setup lang="ts">
import { ref } from 'vue'
import { useSIStore } from '../stores/siStore'
import { formatDate } from '@/utils/dateUtils'

const store = useSIStore()
let currentData: any[] = []
let currentColumns: string[] = []
let currentColumnLabels: string[] = []

function getCurrentDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getExportData(): Record<string, any>[] {
  if (!currentData || currentData.length === 0) return []
  if (!currentColumns || currentColumns.length === 0) return []

  const result: Record<string, any>[] = []
  
  for (let idx = 0; idx < currentData.length; idx++) {
    const item = currentData[idx]
    const row: Record<string, any> = {
      '№ п/п': idx + 1
    }
    
    for (let i = 0; i < currentColumns.length; i++) {
      const colKey = currentColumns[i]
      const colLabel = currentColumnLabels[i]
      
      if (!colKey || !colLabel) continue
      
      let value = ''
      
      if (colKey === 'lastVerificationDate') {
        value = store.getLastVerificationDate(item.id)
        value = value ? formatDate(value) : '-'
      } else if (colKey === 'nextVerificationDate') {
        value = store.getNextVerificationDate(item.id)
        value = value ? formatDate(value) : '-'
      } else if (colKey === 'verificationInterval') {
        value = `${item.verificationInterval} год`
      } else if (colKey === 'status') {
        value = item.status === 'выведено' ? 'Списано' : item.status
      } else {
        const val = item[colKey]
        value = val !== undefined && val !== null ? String(val) : '-'
      }
      
      row[colLabel] = value
    }
    
    result.push(row)
  }
  
  return result
}

function exportToExcel() {
  const data = getExportData()
  if (data.length === 0) {
    alert('Нет данных для экспорта')
    return
  }

  const dateStr = getCurrentDate()
  const formattedDate = `${dateStr.split('-')[2]}.${dateStr.split('-')[1]}.${dateStr.split('-')[0]}`
  const filename = `СИ_${dateStr}`

  import('xlsx')
    .then((XLSX) => {
      const sheetData: any[][] = []
      
      sheetData.push([`Средства измерения (от ${formattedDate})`])
      sheetData.push([])
      
      const firstRow = data[0]
      if (!firstRow) return
      
      const headers = Object.keys(firstRow)
      sheetData.push(headers)
      
      for (const row of data) {
        const rowData = headers.map(header => row[header] !== undefined ? row[header] : '-')
        sheetData.push(rowData)
      }
      
      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      
      if (!ws['!merges']) ws['!merges'] = []
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } })
      
      ws['!cols'] = headers.map(() => ({ wch: 12 }))
      
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Средства измерения')
      XLSX.writeFile(wb, `${filename}.xlsx`)
    })
    .catch((err) => {
      console.error('Ошибка экспорта в Excel:', err)
      alert('Ошибка при экспорте в Excel')
    })
}

function exportToWord() {
  const data = getExportData()
  if (data.length === 0) {
    alert('Нет данных для экспорта')
    return
  }

  const dateStr = getCurrentDate()
  const filename = `СИ_${dateStr}`
  const [year, month, day] = dateStr.split('-')
  const formattedDate = `${day}.${month}.${year}`

  const firstRow = data[0]
  if (!firstRow) return
  
  const headers = Object.keys(firstRow)
  
  // Рассчитываем ширину колонок в см
  const columnCount = headers.length
  const maxWidth = 28 // Максимальная ширина страницы A4 в см (альбомная)
  const columnWidthCm = (maxWidth / columnCount).toFixed(2)
  
  let html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Средства измерения</title>
    <style>
      @page {
        size: A4 landscape;
        margin: 0.5cm;
      }
      body {
        margin: 0.5cm;
        padding: 0;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 9pt;
      }
      h1 {
        text-align: center;
        font-size: 14pt;
        margin-bottom: 10px;
        color: #2c3e50;
      }
      .date {
        text-align: right;
        margin-bottom: 10px;
        font-size: 8pt;
        color: #666;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin-top: 10px;
      }
      th, td {
        border: 1px solid #000000;
        padding: 4px 6px;
        text-align: left;
        vertical-align: top;
        word-break: break-all;
        white-space: normal;
      }
      th {
        background-color: #f2f2f2;
        font-weight: bold;
        font-size: 9pt;
      }
      td {
        font-size: 8pt;
      }
      /* Принудительная ширина колонок */
      ${headers.map((_, idx) => `
        th:nth-child(${idx + 1}), td:nth-child(${idx + 1}) {
          width: ${columnWidthCm}cm;
          max-width: ${columnWidthCm}cm;
          min-width: ${columnWidthCm}cm;
        }
      `).join('')}
    </style>
  </head>
  <body>
    <h1>Средства измерения</h1>
    <div class="date">Дата формирования: ${formattedDate}</div>
    <table>
      <thead>
        <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>${headers.map(h => {
            const val = row[h]
            let text = val !== undefined && val !== null ? String(val) : '-'
            // Ограничиваем длину текста в ячейке
            if (text.length > 50) {
              text = text.substring(0, 47) + '...'
            }
            return `<td>${escapeHtml(text)}</td>`
          }).join('')}</tr>
        `).join('')}
      </tbody>
    </table>
  </body>
  </html>`

  const blob = new Blob([html], { type: 'application/msword' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = `${filename}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function exportDirect(data: any[], columns: string[], columnLabels: string[], type: 'excel' | 'word') {
  currentData = data
  currentColumns = columns
  currentColumnLabels = columnLabels
  
  if (type === 'excel') {
    exportToExcel()
  } else {
    exportToWord()
  }
}

defineExpose({ exportDirect })
</script>