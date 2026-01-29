import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Download, Calendar, FileSpreadsheet, Users, DollarSign, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { 
  exportToExcel, 
  formatLoansForExcel, 
  formatUsersForExcel, 
  formatTransactionsForExcel,
  exportMultipleSheetsToExcel
} from '../../utils/excel'

export function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [generating, setGenerating] = useState<string | null>(null)

  // Obtener datos para exportar
  const { data: loans } = useQuery({
    queryKey: ['loans-export'],
    queryFn: async () => {
      const { data } = await supabase.from('v_loans_summary').select('*')
      return data || []
    },
  })

  const { data: users } = useQuery({
    queryKey: ['users-export'],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*')
      return data || []
    },
  })

  const { data: transactions } = useQuery({
    queryKey: ['transactions-export'],
    queryFn: async () => {
      const { data } = await supabase.from('transactions').select('*').order('payment_date', { ascending: false })
      return data || []
    },
  })

  const pdfReports = [
    {
      id: 'monthly-summary',
      title: 'Resumen Mensual',
      description: 'Ingresos, egresos y comisiones del mes',
      icon: FileText,
    },
    {
      id: 'overdue-loans',
      title: 'Préstamos en Mora',
      description: 'Listado de préstamos con pagos atrasados',
      icon: FileText,
    },
    {
      id: 'investor-returns',
      title: 'Rendimientos Inversionistas',
      description: 'Pagos realizados a cada inversionista',
      icon: FileText,
    },
    {
      id: 'interest-projection',
      title: 'Proyección de Intereses',
      description: 'Intereses esperados para el próximo mes',
      icon: FileText,
    },
  ]

  const excelExports = [
    {
      id: 'loans',
      title: 'Préstamos',
      description: 'Exportar todos los préstamos con detalles',
      icon: DollarSign,
      action: () => {
        if (loans && loans.length > 0) {
          exportToExcel(formatLoansForExcel(loans), {
            filename: `Prestamos_${selectedMonth}`,
            sheetName: 'Préstamos'
          })
        } else {
          alert('No hay préstamos para exportar')
        }
      }
    },
    {
      id: 'users',
      title: 'Usuarios',
      description: 'Exportar inversionistas y deudores',
      icon: Users,
      action: () => {
        if (users && users.length > 0) {
          exportToExcel(formatUsersForExcel(users), {
            filename: `Usuarios_${selectedMonth}`,
            sheetName: 'Usuarios'
          })
        } else {
          alert('No hay usuarios para exportar')
        }
      }
    },
    {
      id: 'transactions',
      title: 'Transacciones',
      description: 'Exportar historial de movimientos',
      icon: TrendingUp,
      action: () => {
        if (transactions && transactions.length > 0) {
          exportToExcel(formatTransactionsForExcel(transactions), {
            filename: `Transacciones_${selectedMonth}`,
            sheetName: 'Transacciones'
          })
        } else {
          alert('No hay transacciones para exportar')
        }
      }
    },
    {
      id: 'complete',
      title: 'Reporte Completo',
      description: 'Todas las hojas en un solo archivo',
      icon: FileSpreadsheet,
      action: () => {
        const sheets = []
        if (loans && loans.length > 0) {
          sheets.push({ name: 'Préstamos', data: formatLoansForExcel(loans) })
        }
        if (users && users.length > 0) {
          sheets.push({ name: 'Usuarios', data: formatUsersForExcel(users) })
        }
        if (transactions && transactions.length > 0) {
          sheets.push({ name: 'Transacciones', data: formatTransactionsForExcel(transactions) })
        }
        
        if (sheets.length > 0) {
          exportMultipleSheetsToExcel(sheets, `Proyecty_Completo_${selectedMonth}`)
        } else {
          alert('No hay datos para exportar')
        }
      }
    },
  ]

  const handleGenerateReport = async (reportId: string) => {
    setGenerating(reportId)
    // TODO: Implementar generación de PDF con jsPDF
    setTimeout(() => {
      alert(`Generando reporte PDF: ${reportId} para ${selectedMonth}\n\n(Funcionalidad próximamente)`)
      setGenerating(null)
    }, 500)
  }

  const handleExportExcel = async (exportConfig: typeof excelExports[0]) => {
    setGenerating(exportConfig.id)
    try {
      exportConfig.action()
    } catch (error) {
      console.error('Error exportando:', error)
      alert('Error al exportar. Intenta de nuevo.')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 mt-1">
          Genera reportes en PDF o exporta datos a Excel para análisis
        </p>
      </div>

      {/* Month Selector */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <label className="text-sm font-medium text-gray-700">
              Período:
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input w-auto"
            />
          </div>
        </div>
      </div>

      {/* Excel Exports Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          Exportar a Excel
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {excelExports.map((exportItem) => (
            <div key={exportItem.id} className="card">
              <div className="card-body">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <exportItem.icon className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm">{exportItem.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{exportItem.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleExportExcel(exportItem)}
                  disabled={generating === exportItem.id}
                  className="btn-secondary w-full mt-3 text-sm py-2"
                >
                  {generating === exportItem.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Exportando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Descargar .xlsx
                    </span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PDF Reports Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-red-600" />
          Reportes PDF
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pdfReports.map((report) => (
            <div key={report.id} className="card">
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-50 rounded-xl">
                    <report.icon className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{report.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <button
                  onClick={() => handleGenerateReport(report.id)}
                  disabled={generating === report.id}
                  className="btn-primary w-full"
                >
                  {generating === report.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Generar PDF
                    </span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
