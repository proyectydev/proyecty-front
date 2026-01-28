import { useState } from 'react'
import { FileText, Download, Calendar } from 'lucide-react'

export function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const reports = [
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

  const handleGenerateReport = async (reportId: string) => {
    // TODO: Implementar generación de PDF
    alert(`Generando reporte: ${reportId} para ${selectedMonth}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 mt-1">
          Genera reportes en PDF para análisis y documentación
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

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="card">
            <div className="card-body">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary-50 rounded-xl">
                  <report.icon className="w-6 h-6 text-primary-600" />
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
                className="btn-primary w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Generar PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
