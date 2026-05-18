export interface Verification {
  id: number
  siId: number
  transferDate: string // YYYY-MM-DD
  receiptDate: string
  verifier: string
  result: 'годен' | 'не годен'
  notes?: string
}
export type InstrumentStatus = 'в эксплуатации' | 'на поверке' | 'выведено'
export interface MeasuringInstrument {
  id: number
  tabulNumber: string // Табульный номер
  name: string // Наименование/тип
  verificationInterval: number // Межповерочный интервал (годы)
  lastVerificationDate: string // Дата последней поверки
  nextVerificationDate: string // Рассчитывается автоматически
  status: InstrumentStatus
  location: string // Местоположение
  verifier?: string // Последний поверитель
  additionalData?: any // JSON
  isDeleted: boolean
}

export interface User {
  id: number
  login: string
  role: 'observer' | 'operator' | 'admin'
}

export interface FilterParams {
  search?: string
  status?: string
  verifier?: string
  location?: string
  daysToVerification?: number // 30
}
