/**
 * Formatea un número como moneda colombiana (COP)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formatea una fecha en formato colombiano
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Formatea una fecha con hora
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Formatea un porcentaje
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

/**
 * Calcula el interés mensual
 */
export function calculateMonthlyInterest(balance: number, annualRate: number): number {
  return (balance * annualRate) / 100 / 12
}

/**
 * Formatea un número de teléfono colombiano
 */
export function formatPhone(phone: string): string {
  // Eliminar caracteres no numéricos
  const clean = phone.replace(/\D/g, '')
  
  // Si tiene 10 dígitos (celular colombiano)
  if (clean.length === 10) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`
  }
  
  return phone
}
