export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`
  }
  return dateStr
}

export function addYears(dateStr: string | undefined, years: number): string {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  date.setFullYear(date.getFullYear() + years)

  // Форматируем дату в YYYY-MM-DD напрямую, без parseToYMD
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function daysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diff = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
  return isNaN(diff) ? 0 : diff
}

export function getDaysUntilVerification(nextDate: string | undefined): number {
  if (!nextDate) return Infinity
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return daysDiff(todayStr, nextDate)
}

export function getCurrentDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
