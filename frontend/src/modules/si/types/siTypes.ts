import type { InstrumentStatus } from "@/types"

export interface MeasuringInstrument {
  id: string
  tabNumber: string
  name: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  inventoryNumber?: string
  nodeId?: string
  nodeName?: string
  typeId?: string
  typeName?: string
  location?: string
  mainParams?: Record<string, any>
  productionDate?: string
  transferDate?: string
  receiptDate?: string
  verificationInterval: number
  status: InstrumentStatus
  lastVerificationDate?: string
  nextVerificationDate?: string
  verifier?: string
  notes?: string
  subsystemId?: string
  additionalData?: any
  isDeleted: boolean
}

export interface Verification {
  id: string
  siId: string
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
