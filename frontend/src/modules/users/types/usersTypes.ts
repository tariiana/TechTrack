export type UserRole = 'operator' | 'admin' | 'observer'

export interface User {
  id: number
  login: string
  password: string
  name: string
  role: UserRole
  createdAt: string
  updatedAt: string
  isDeleted: boolean
}
