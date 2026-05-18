export type InstrumentStatus = 'в эксплуатации' | 'на поверке' | 'в ремонте' | 'выведено'

export interface MeasuringInstrument {
  id: number
  tabNumber: string
  name: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  inventoryNumber?: string
  nodeId?: number
  nodeName?: string
  typeId?: number
  typeName?: string
  location?: string
  mainParams?: string
  productionDate?: string
  transferDate?: string
  receiptDate?: string
  verificationInterval: number
  status: InstrumentStatus
  lastVerificationDate?: string
  nextVerificationDate?: string
  verifier?: string
  notes?: string
  subsystemId: number
  additionalData?: any
  isDeleted: boolean
}

export interface Verification {
  id: number
  siId: number
  transferDate: string
  receiptDate: string
  verifier: string
  result: 'годен' | 'не годен'
  notes?: string
}

export interface FilterParams {
  search?: string
  status?: InstrumentStatus | ''
}
