import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { 
  Plus, Search, Building2, Eye, MapPin, 
  FileText, CheckCircle, Clock, AlertTriangle, Ban, Edit,
  Trash2, Upload, X
} from 'lucide-react'
import { formatCurrency } from '../../utils/format'
import { NewPropertyModal } from '../../components/modals'

// Estados de la propiedad en relación a hipotecas
type PropertyStatus = 'available' | 'mortgaged' | 'funding' | 'review' | 'closed'

const statusConfig: Record<PropertyStatus, { label: string; icon: typeof CheckCircle; colorClass: string; bgClass: string }> = {
  available: { 
    label: 'Disponible', 
    icon: CheckCircle, 
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50 border-green-200'
  },
  mortgaged: { 
    label: 'Hipotecada', 
    icon: Building2, 
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50 border-blue-200'
  },
  funding: { 
    label: 'Recaudando', 
    icon: Clock, 
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50 border-amber-200'
  },
  review: { 
    label: 'En Revisión', 
    icon: AlertTriangle, 
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-50 border-orange-200'
  },
  closed: { 
    label: 'Cerrada', 
    icon: Ban, 
    colorClass: 'text-gray-600',
    bgClass: 'bg-gray-50 border-gray-200'
  },
}

interface PropertyWithLoan {
  id: string
  property_name: string
  property_type: string
  address: string
  neighborhood: string | null
  city: string
  department: string
  appraisal_value: number | null
  commercial_value: number | null
  matricula_inmobiliaria: string | null
  main_image_url: string | null
  created_at: string
  // Datos del préstamo si existe
  loan?: {
    id: string
    loan_code: string
    status: string
    requested_amount: number
    funded_amount: number
    current_balance: number
    borrower_name: string
  } | null
}

export function PropertiesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showNewPropertyModal, setShowNewPropertyModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithLoan | null>(null)
  const [showPropertyDetail, setShowPropertyDetail] = useState(false)
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false)

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties-with-loans', search, statusFilter],
    queryFn: async () => {
      // Primero obtenemos las propiedades
      let query = supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`property_name.ilike.%${search}%,address.ilike.%${search}%,matricula_inmobiliaria.ilike.%${search}%`)
      }

      const { data: propertiesData, error: propError } = await query
      if (propError) throw propError

      // Luego obtenemos los préstamos activos para cada propiedad
      const { data: loansData } = await supabase
        .from('loans')
        .select(`
          id, 
          loan_code, 
          status, 
          property_id,
          requested_amount, 
          funded_amount, 
          current_balance,
          borrower:users!loans_borrower_id_fkey(full_name)
        `)
        .not('status', 'in', '("cancelled","paid_off")')

      // Mapeamos préstamos por property_id
      const loansByProperty = new Map()
      loansData?.forEach((loan: Record<string, unknown>) => {
        // El borrower puede venir como objeto o como array
        const borrowerRaw = loan.borrower as { full_name: string } | { full_name: string }[] | null
        const borrowerData = Array.isArray(borrowerRaw) ? borrowerRaw[0] : borrowerRaw
        loansByProperty.set(loan.property_id, {
          id: loan.id,
          loan_code: loan.loan_code,
          status: loan.status,
          requested_amount: loan.requested_amount,
          funded_amount: loan.funded_amount,
          current_balance: loan.current_balance,
          borrower_name: borrowerData?.full_name || 'Sin asignar'
        })
      })

      // Combinamos
      const combined = propertiesData?.map(prop => ({
        ...prop,
        loan: loansByProperty.get(prop.id) || null
      })) as PropertyWithLoan[]

      // Filtramos por estado si es necesario
      if (statusFilter) {
        return combined.filter(prop => {
          const status = getPropertyStatus(prop)
          return status === statusFilter
        })
      }

      return combined
    },
  })

  // Determinar el estado de la propiedad basado en su préstamo
  function getPropertyStatus(property: PropertyWithLoan): PropertyStatus {
    if (!property.loan) return 'available'
    
    switch (property.loan.status) {
      case 'draft':
      case 'review':
        return 'review'
      case 'fundraising':
      case 'funding':
        return 'funding'
      case 'funded':
      case 'disbursed':
      case 'current':
      case 'overdue':
      case 'active':
        return 'mortgaged'
      case 'paid_off':
      case 'defaulted':
        return 'closed'
      default:
        return 'available'
    }
  }

  // Calcular progreso de recaudación
  function getFundingProgress(property: PropertyWithLoan): number {
    if (!property.loan) return 0
    const funded = property.loan.funded_amount || 0
    const requested = property.loan.requested_amount || 1
    return Math.min(100, (funded / requested) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propiedades</h1>
          <p className="text-gray-500 mt-1">
            Gestiona las propiedades y sus hipotecas
          </p>
        </div>
        <button onClick={() => setShowNewPropertyModal(true)} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Nueva Propiedad
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = properties?.filter(p => getPropertyStatus(p) === key).length || 0
          const Icon = config.icon
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              className={`p-4 rounded-xl border-2 transition-all ${
                statusFilter === key 
                  ? `${config.bgClass} border-current` 
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${config.colorClass}`} />
                <div className="text-left">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500">{config.label}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, dirección o matrícula..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">Todos los estados</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Cargando propiedades...</p>
        </div>
      ) : properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => {
            const status = getPropertyStatus(property)
            const config = statusConfig[status]
            const Icon = config.icon
            const progress = getFundingProgress(property)

            return (
              <div 
                key={property.id} 
                className="card hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                onClick={() => {
                  if (property.loan) {
                    navigate(`/admin/hipotecas/${property.loan.id}`)
                  }
                }}
              >
                {/* Imagen de la propiedad */}
                {property.main_image_url ? (
                  <div className="h-48 w-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    <img 
                      src={property.main_image_url} 
                      alt={property.property_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-48 w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-gray-300" />
                  </div>
                )}

                <div className="card-body">
                  {/* Header con estado */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${config.bgClass} ${config.colorClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {config.label}
                    </div>
                    {property.loan && (
                      <span className="text-xs font-mono text-gray-500">
                        {property.loan.loan_code}
                      </span>
                    )}
                  </div>

                  {/* Info de la propiedad */}
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {property.property_name}
                  </h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                    <MapPin className="w-4 h-4" />
                    {property.address}
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    {property.property_type} • {property.city}
                  </p>

                  {/* Valor de avalúo */}
                  {property.appraisal_value && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-gray-500">Avalúo</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(property.appraisal_value)}
                      </p>
                    </div>
                  )}

                  {/* Info de hipoteca si existe */}
                  {property.loan && (
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Cliente:</span>
                        <span className="font-medium">{property.loan.borrower_name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Monto:</span>
                        <span className="font-medium">{formatCurrency(property.loan.requested_amount)}</span>
                      </div>

                      {/* Barra de progreso para recaudación */}
                      {status === 'funding' && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Recaudado</span>
                            <span className="font-medium">{progress.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatCurrency(property.loan.funded_amount || 0)} de {formatCurrency(property.loan.requested_amount)}
                          </p>
                        </div>
                      )}

                      {/* Saldo para hipotecas activas */}
                      {status === 'mortgaged' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Saldo:</span>
                          <span className="font-medium text-blue-600">
                            {formatCurrency(property.loan.current_balance || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <button 
                      className="btn-secondary flex-1 text-sm py-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedProperty(property)
                        setShowPropertyDetail(true)
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </button>
                    <button 
                      className="btn-secondary flex-1 text-sm py-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedProperty(property)
                        setShowEditPropertyModal(true)
                      }}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </button>
                    {property.loan && (
                      <button 
                        className="btn-primary flex-1 text-sm py-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/admin/hipotecas/${property.loan!.id}`)
                        }}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Hipoteca
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-gray-500 mt-4">No hay propiedades registradas</p>
            <button onClick={() => setShowNewPropertyModal(true)} className="btn-primary mt-4">
              <Plus className="w-5 h-5 mr-2" />
              Agregar primera propiedad
            </button>
          </div>
        </div>
      )}

      {/* Modal Nueva Propiedad */}
      <NewPropertyModal 
        isOpen={showNewPropertyModal} 
        onClose={() => {
          setShowNewPropertyModal(false)
          queryClient.invalidateQueries({ queryKey: ['properties-with-loans'] })
        }} 
      />

      {/* Modal Ver Detalles de Propiedad */}
      {showPropertyDetail && selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => {
            setShowPropertyDetail(false)
            setSelectedProperty(null)
          }}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['properties-with-loans'] })
          }}
        />
      )}

      {/* Modal Editar Propiedad */}
      {showEditPropertyModal && selectedProperty && (
        <EditPropertyModal
          property={selectedProperty}
          onClose={() => {
            setShowEditPropertyModal(false)
            setSelectedProperty(null)
          }}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['properties-with-loans'] })
          }}
        />
      )}
    </div>
  )
}

// Modal para ver detalles de la propiedad
function PropertyDetailModal({ 
  property, 
  onClose,
  onUpdate
}: { 
  property: PropertyWithLoan
  onClose: () => void
  onUpdate: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState(property.main_image_url)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validaciones
    if (!file.type.startsWith('image/')) {
      alert('El archivo debe ser una imagen')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar 5MB')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${property.id}/main.${fileExt}`

      // Subir a storage
      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName)

      // Actualizar en la base de datos
      const { error: updateError } = await supabase
        .from('properties')
        .update({ main_image_url: data.publicUrl })
        .eq('id', property.id)

      if (updateError) throw updateError

      setImageUrl(data.publicUrl + '?t=' + Date.now()) // Cache busting
      onUpdate()
    } catch (err) {
      console.error('Error uploading image:', err)
      alert('Error al subir la imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    if (!confirm('¿Eliminar la imagen de esta propiedad?')) return

    setUploading(true)
    try {
      // Actualizar en la base de datos (poner null)
      const { error: updateError } = await supabase
        .from('properties')
        .update({ main_image_url: null })
        .eq('id', property.id)

      if (updateError) throw updateError

      setImageUrl(null)
      onUpdate()
    } catch (err) {
      console.error('Error removing image:', err)
      alert('Error al eliminar la imagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Imagen */}
          <div className="relative">
            {imageUrl ? (
              <div className="relative h-56 w-full bg-gray-100 flex items-center justify-center">
                <img 
                  src={imageUrl} 
                  alt={property.property_name}
                  className="max-w-full max-h-full object-contain"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-lg shadow transition-colors"
                    title="Cambiar imagen"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleRemoveImage}
                    disabled={uploading}
                    className="p-2 bg-red-500/90 hover:bg-red-500 text-white rounded-lg shadow transition-colors"
                    title="Eliminar imagen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="h-48 w-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center cursor-pointer hover:from-gray-200 hover:to-gray-300 transition-colors"
              >
                {uploading ? (
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click para agregar imagen</p>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {uploading && imageUrl && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{property.property_name}</h2>
                <p className="text-sm text-gray-500">{property.property_type}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Ubicación */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Ubicación
                </h3>
                <p className="text-gray-700">{property.address}</p>
                {property.neighborhood && (
                  <p className="text-sm text-gray-500">Barrio: {property.neighborhood}</p>
                )}
                <p className="text-sm text-gray-500">{property.city}, {property.department}</p>
              </div>

              {/* Datos Legales */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Datos Legales
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Matrícula:</span>
                    <span className="ml-2 text-gray-900">{property.matricula_inmobiliaria || 'No registrada'}</span>
                  </div>
                </div>
              </div>

              {/* Valores */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Valores
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Avalúo</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {property.appraisal_value ? formatCurrency(property.appraisal_value) : 'No registrado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Valor Comercial</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {property.commercial_value ? formatCurrency(property.commercial_value) : 'No registrado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info de Hipoteca si existe */}
              {property.loan && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Hipoteca Asociada</h3>
                  <p className="text-sm text-blue-700">
                    Código: <strong>{property.loan.loan_code}</strong>
                  </p>
                  <p className="text-sm text-blue-700">
                    Cliente: <strong>{property.loan.borrower_name}</strong>
                  </p>
                  <p className="text-sm text-blue-700">
                    Monto: <strong>{formatCurrency(property.loan.requested_amount)}</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t">
              <button onClick={onClose} className="btn-secondary w-full">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Modal para editar propiedad
function EditPropertyModal({ 
  property, 
  onClose,
  onUpdate
}: { 
  property: PropertyWithLoan
  onClose: () => void
  onUpdate: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    property_name: property.property_name,
    property_type: property.property_type,
    address: property.address,
    neighborhood: property.neighborhood || '',
    city: property.city,
    department: property.department,
    appraisal_value: property.appraisal_value?.toString() || '',
    commercial_value: property.commercial_value?.toString() || '',
    matricula_inmobiliaria: property.matricula_inmobiliaria || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('properties')
        .update({
          property_name: formData.property_name,
          property_type: formData.property_type,
          address: formData.address,
          neighborhood: formData.neighborhood || null,
          city: formData.city,
          department: formData.department,
          appraisal_value: formData.appraisal_value ? parseFloat(formData.appraisal_value.replace(/[^\d]/g, '')) : null,
          commercial_value: formData.commercial_value ? parseFloat(formData.commercial_value.replace(/[^\d]/g, '')) : null,
          matricula_inmobiliaria: formData.matricula_inmobiliaria || null,
        })
        .eq('id', property.id)

      if (error) throw error

      onUpdate()
      onClose()
    } catch (err) {
      console.error('Error updating property:', err)
      alert('Error al actualizar la propiedad')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Editar Propiedad</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="label">Nombre de la Propiedad *</label>
                <input
                  type="text"
                  name="property_name"
                  value={formData.property_name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="label">Tipo de Propiedad</label>
                <select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="Casa">Casa</option>
                  <option value="Apartamento">Apartamento</option>
                  <option value="Local">Local Comercial</option>
                  <option value="Oficina">Oficina</option>
                  <option value="Bodega">Bodega</option>
                  <option value="Lote">Lote</option>
                  <option value="Finca">Finca</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Dirección */}
              <div>
                <label className="label">Dirección *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              {/* Barrio */}
              <div>
                <label className="label">Barrio</label>
                <input
                  type="text"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              {/* Ciudad y Departamento */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Ciudad *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Departamento *</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
              </div>

              {/* Matrícula */}
              <div>
                <label className="label">Matrícula Inmobiliaria</label>
                <input
                  type="text"
                  name="matricula_inmobiliaria"
                  value={formData.matricula_inmobiliaria}
                  onChange={handleChange}
                  className="input"
                  placeholder="000-00000"
                />
              </div>

              {/* Valores */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Avalúo ($)</label>
                  <input
                    type="text"
                    name="appraisal_value"
                    value={formData.appraisal_value}
                    onChange={handleChange}
                    className="input"
                    placeholder="200000000"
                  />
                </div>
                <div>
                  <label className="label">Valor Comercial ($)</label>
                  <input
                    type="text"
                    name="commercial_value"
                    value={formData.commercial_value}
                    onChange={handleChange}
                    className="input"
                    placeholder="200000000"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
