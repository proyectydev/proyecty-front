import * as XLSX from 'xlsx'

interface ExportOptions {
  filename: string
  sheetName?: string
}

/**
 * Exporta datos a un archivo Excel (.xlsx)
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions
): void {
  const { filename, sheetName = 'Datos' } = options

  // Crear worksheet desde los datos
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Crear workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Auto-ajustar ancho de columnas
  const columnWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...data.map((row) => String(row[key] || '').length)
    ),
  }))
  worksheet['!cols'] = columnWidths

  // Descargar archivo
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Exporta múltiples hojas a un archivo Excel
 */
export function exportMultipleSheetsToExcel(
  sheets: { name: string; data: Record<string, unknown>[] }[],
  filename: string
): void {
  const workbook = XLSX.utils.book_new()

  sheets.forEach(({ name, data }) => {
    if (data.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(data)
      
      // Auto-ajustar ancho de columnas
      const columnWidths = Object.keys(data[0]).map((key) => ({
        wch: Math.max(
          key.length,
          ...data.map((row) => String(row[key] || '').length)
        ),
      }))
      worksheet['!cols'] = columnWidths
      
      XLSX.utils.book_append_sheet(workbook, worksheet, name)
    }
  })

  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Formatea datos de préstamos para Excel
 */
export function formatLoansForExcel(loans: Record<string, unknown>[]) {
  return loans.map((loan) => ({
    'Código': loan.loan_code,
    'Deudor': loan.borrower_name,
    'Propiedad': loan.property_name,
    'Monto Solicitado': loan.requested_amount,
    'Monto Desembolsado': loan.disbursed_amount,
    'Saldo Actual': loan.current_balance,
    'Tasa Anual (%)': loan.annual_interest_rate,
    'Plazo (Meses)': loan.term_months,
    'Estado': loan.status,
    'Fecha Solicitud': loan.application_date,
    'Fecha Desembolso': loan.disbursement_date,
    'Fecha Vencimiento': loan.maturity_date,
    '# Inversionistas': loan.investor_count,
    'Intereses Pagados': loan.total_interest_paid,
    'Capital Pagado': loan.total_principal_paid,
  }))
}

/**
 * Formatea datos de usuarios para Excel
 */
export function formatUsersForExcel(users: Record<string, unknown>[]) {
  return users.map((user) => ({
    'Nombre': user.full_name,
    'Email': user.email,
    'Teléfono': user.phone,
    'Tipo Documento': user.document_type,
    'Número Documento': user.document_number,
    'Tipo Usuario': user.user_type,
    'Ciudad': user.city,
    'Departamento': user.department,
    'Banco': user.bank_name,
    'Tipo Cuenta': user.bank_account_type,
    'Número Cuenta': user.bank_account_number,
    'Verificado': user.is_verified ? 'Sí' : 'No',
    'Activo': user.is_active ? 'Sí' : 'No',
    'Fecha Registro': user.created_at,
  }))
}

/**
 * Formatea datos de transacciones para Excel
 */
export function formatTransactionsForExcel(transactions: Record<string, unknown>[]) {
  return transactions.map((tx) => ({
    'Código': tx.transaction_code,
    'Tipo': tx.transaction_type,
    'Monto': tx.amount,
    'Intereses': tx.interest_portion,
    'Capital': tx.principal_portion,
    'Comisión': tx.commission_portion,
    'Método Pago': tx.payment_method,
    'Referencia': tx.payment_reference,
    'Fecha': tx.payment_date,
    'Estado': tx.status,
    'Descripción': tx.description,
  }))
}

/**
 * Formatea datos de inversiones para Excel
 */
export function formatInvestmentsForExcel(investments: Record<string, unknown>[]) {
  return investments.map((inv) => ({
    'Inversionista': inv.investor_name,
    'Préstamo': inv.loan_code,
    'Monto Comprometido': inv.committed_amount,
    'Monto Transferido': inv.transferred_amount,
    'Valor Actual': inv.current_value,
    'Participación (%)': inv.participation_percentage,
    'Tasa Retorno (%)': inv.investor_rate,
    'Estado': inv.status,
    'Fecha Compromiso': inv.commitment_date,
    'Fecha Transferencia': inv.transfer_date,
  }))
}
