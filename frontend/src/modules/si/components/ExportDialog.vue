<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">Экспорт данных</div>
      <div class="form-group">
        <label>Формат файла</label>
        <select v-model="format" class="form-control">
          <option value="excel">Microsoft Excel (.xlsx)</option>
          <option value="word">Microsoft Word (.docx)</option>
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" @click="exportData">Экспортировать</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSIStore } from '../stores/siStore'
import { formatDate } from '@/utils/dateUtils'

const store = useSIStore()
const visible = ref(false)
const format = ref<'excel' | 'word'>('excel')
let currentData: any[] = []

// Функция для получения текущей даты в формате ГГГГ-ММ-ДД
function getCurrentDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Подготовка данных для экспорта с русскими заголовками
function getExportData() {
  if (!currentData || currentData.length === 0) return []

  return currentData.map((si) => ({
    '№ п/п': si.id,
    'Табельный номер': si.tabNumber || '',
    Наименование: si.name || '',
    Местоположение: si.location || '-',
    'Последняя поверка': si.lastVerificationDate ? formatDate(si.lastVerificationDate) : '-',
    'Следующая поверка': si.nextVerificationDate ? formatDate(si.nextVerificationDate) : '-',
    Статус: si.status || '',
  }))
}

// Экспорт в Excel
function exportToExcel() {
  const data = getExportData()
  if (data.length === 0) {
    alert('Нет данных для экспорта')
    return
  }

  const dateStr = getCurrentDate()
  const formattedDate = `${dateStr.split('-')[2]}.${dateStr.split('-')[1]}.${dateStr.split('-')[0]}`
  const filename = `СИ_${dateStr}`
  const title = `Средства измерения (от ${formattedDate})`

  // Динамический импорт SheetJS
  import('xlsx')
    .then((XLSX) => {
      // Создаём массив для данных
      const sheetData = []

      // Первая строка - заголовок
      sheetData.push([title])
      // Пустая строка для отступа
      sheetData.push([])
      // Заголовки колонок
      sheetData.push([
        '№ п/п',
        'Табельный номер',
        'Наименование',
        'Местоположение',
        'Последняя поверка',
        'Следующая поверка',
        'Статус',
      ])

      // Данные
      for (const row of data) {
        sheetData.push([
          row['№ п/п'],
          row['Табельный номер'],
          row['Наименование'],
          row['Местоположение'],
          row['Последняя поверка'],
          row['Следующая поверка'],
          row['Статус'],
        ])
      }

      // Создаём рабочий лист
      const ws = XLSX.utils.aoa_to_sheet(sheetData)

      // Объединяем ячейки для заголовка (от A1 до G1)
      if (!ws['!merges']) ws['!merges'] = []
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } })

      // Стилизация заголовка (жирный шрифт, больший размер)
      if (!ws['!cols']) ws['!cols'] = []

      // Ширина колонок
      ws['!cols'] = [
        { wch: 8 }, // № п/п
        { wch: 15 }, // Табельный номер
        { wch: 35 }, // Наименование
        { wch: 20 }, // Местоположение
        { wch: 15 }, // Последняя поверка
        { wch: 15 }, // Следующая поверка
        { wch: 15 }, // Статус
      ]

      // Создаём книгу и добавляем лист
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Средства измерения')

      // Сохраняем файл
      XLSX.writeFile(wb, `${filename}.xlsx`)
    })
    .catch((err) => {
      console.error('Ошибка экспорта в Excel:', err)
      alert('Ошибка при экспорте в Excel')
    })
}

// Экспорт в Word
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

  let html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Средства измерения</title>
    <style>
      body {
        margin: 1cm;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 10pt;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin-top: 10px;
        table-layout: fixed;
      }
      th, td {
        border: 1px solid #000000;
        padding: 6px;
        text-align: left;
        vertical-align: top;
        word-wrap: break-word;
      }
      th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
      /* Ширина колонок в процентах */
      th:nth-child(1), td:nth-child(1) { width: 5%; }   /* № п/п */
      th:nth-child(2), td:nth-child(2) { width: 12%; }  /* Табельный номер */
      th:nth-child(3), td:nth-child(3) { width: 28%; }  /* Наименование */
      th:nth-child(4), td:nth-child(4) { width: 18%; }  /* Местоположение */
      th:nth-child(5), td:nth-child(5) { width: 12%; }  /* Последняя поверка */
      th:nth-child(6), td:nth-child(6) { width: 12%; }  /* Следующая поверка */
      th:nth-child(7), td:nth-child(7) { width: 13%; }  /* Статус */
      h1 {
        text-align: center;
        font-size: 14pt;
        margin-bottom: 15px;
      }
      .date {
        text-align: right;
        margin-bottom: 15px;
        font-size: 9pt;
      }
    </style>
  </head>
  <body>
    <h1>Средства измерения</h1>
    <div class="date">Дата формирования: ${formattedDate}</div>
    <table>
      <thead>
        <tr>`

  const headers = [
    '№ п/п',
    'Табельный номер',
    'Наименование',
    'Местоположение',
    'Последняя поверка',
    'Следующая поверка',
    'Статус',
  ]
  for (const header of headers) {
    html += `<th>${header}</th>`
  }
  html += `</thead><tbody>`

  for (const row of data) {
    html += `<tr>`
    html += `<td>${row['№ п/п']}</td>`
    html += `<td>${row['Табельный номер']}</td>`
    html += `<td>${row['Наименование']}</td>`
    html += `<td>${row['Местоположение']}</td>`
    html += `<td>${row['Последняя поверка']}</td>`
    html += `<td>${row['Следующая поверка']}</td>`
    html += `<td>${row['Статус']}</td>`
    html += `</tr>`
  }

  html += `</tbody></table></body></html>`

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

function open(data: any[]) {
  currentData = data
  visible.value = true
}

function close() {
  visible.value = false
}

function exportData() {
  if (format.value === 'excel') {
    exportToExcel()
  } else {
    exportToWord()
  }
  close()
}

defineExpose({ open })
</script>
