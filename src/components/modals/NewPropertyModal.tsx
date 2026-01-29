import { useState, useRef } from 'react'
import { X, Image as ImageIcon, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

interface NewPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onPropertyCreated?: (propertyId: string) => void
}

export function NewPropertyModal({ isOpen, onClose, onPropertyCreated }: NewPropertyModalProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    property_name: '',
    property_type: 'Casa',
    address: '',
    neighborhood: '',
    city: 'Cúcuta',
    department: 'Norte de Santander',
    matricula_inmobiliaria: '',
    cedula_catastral: '',
    appraisal_value: '',
    appraisal_date: '',
    commercial_value: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setError('El archivo debe ser una imagen')
        return
      }
      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no debe superar 5MB')
        return
      }
      setImageFile(file)
      // Crear preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setError('')
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadImage = async (propertyId: string): Promise<string | null> => {
    if (!imageFile) return null

    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${propertyId}/main.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(fileName, imageFile, { upsert: true })

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return null
    }

    const { data } = supabase.storage
      .from('property-images')
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.property_name.trim()) {
        throw new Error('El nombre de la propiedad es requerido')
      }
      if (!formData.address.trim()) {
        throw new Error('La dirección es requerida')
      }

      const { data, error: insertError } = await supabase
        .from('properties')
        .insert([{
          property_name: formData.property_name,
          property_type: formData.property_type,
          address: formData.address,
          neighborhood: formData.neighborhood || null,
          city: formData.city,
          department: formData.department,
          matricula_inmobiliaria: formData.matricula_inmobiliaria || null,
          cedula_catastral: formData.cedula_catastral || null,
          appraisal_value: formData.appraisal_value ? parseFloat(formData.appraisal_value) : null,
          commercial_value: formData.commercial_value ? parseFloat(formData.commercial_value) : null,
          appraisal_date: formData.appraisal_date || null,
        }])
        .select()
        .single()

      if (insertError) throw insertError

      // Subir imagen si existe
      if (data && imageFile) {
        const imageUrl = await uploadImage(data.id)
        if (imageUrl) {
          // Actualizar la propiedad con la URL de la imagen
          await supabase
            .from('properties')
            .update({ main_image_url: imageUrl })
            .eq('id', data.id)
        }
      }

      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['properties-with-loans'] })
      
      if (onPropertyCreated && data) {
        onPropertyCreated(data.id)
      }
      
      onClose()
      setFormData({
        property_name: '',
        property_type: 'Casa',
        address: '',
        neighborhood: '',
        city: 'Cúcuta',
        department: 'Norte de Santander',
        matricula_inmobiliaria: '',
        cedula_catastral: '',
        appraisal_value: '',
        appraisal_date: '',
        commercial_value: '',
      })
      setImageFile(null)
      setImagePreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear propiedad')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Nueva Propiedad</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Imagen Principal */}
            <div>
              <label className="label">Imagen Principal</label>
              <div className="mt-1">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-gray-100 rounded-full">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          <span className="text-primary-600">Subir imagen</span> o arrastrar
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG hasta 5MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Información Básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Nombre de la Propiedad *</label>
                <input
                  type="text"
                  name="property_name"
                  value={formData.property_name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Ej: Casa Barrio Centro, Apto 301 Torres del Parque"
                  required
                />
              </div>

              <div>
                <label className="label">Tipo de Propiedad *</label>
                <select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="Casa">Casa</option>
                  <option value="Apartamento">Apartamento</option>
                  <option value="Lote">Lote</option>
                  <option value="Local">Local Comercial</option>
                  <option value="Bodega">Bodega</option>
                  <option value="Finca">Finca</option>
                  <option value="Oficina">Oficina</option>
                </select>
              </div>

              <div>
                <label className="label">Barrio</label>
                <input
                  type="text"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  className="input"
                  placeholder="Barrio Centro"
                />
              </div>
            </div>

            {/* Ubicación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Dirección Completa *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="input"
                  placeholder="Calle 10 # 5-20"
                  required
                />
              </div>

              <div>
                <label className="label">Ciudad</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Departamento</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>

            {/* Información Legal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Matrícula Inmobiliaria</label>
                <input
                  type="text"
                  name="matricula_inmobiliaria"
                  value={formData.matricula_inmobiliaria}
                  onChange={handleChange}
                  className="input"
                  placeholder="060-123456"
                />
              </div>

              <div>
                <label className="label">Cédula Catastral</label>
                <input
                  type="text"
                  name="cedula_catastral"
                  value={formData.cedula_catastral}
                  onChange={handleChange}
                  className="input"
                  placeholder="01-02-0304-0056"
                />
              </div>
            </div>

            {/* Valoración */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Valoración</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Valor del Avalúo (COP)</label>
                  <input
                    type="number"
                    name="appraisal_value"
                    value={formData.appraisal_value}
                    onChange={handleChange}
                    className="input"
                    placeholder="150000000"
                    min="0"
                    step="1000000"
                  />
                </div>

                <div>
                  <label className="label">Fecha del Avalúo</label>
                  <input
                    type="date"
                    name="appraisal_date"
                    value={formData.appraisal_date}
                    onChange={handleChange}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Valor Comercial (COP)</label>
                  <input
                    type="number"
                    name="commercial_value"
                    value={formData.commercial_value}
                    onChange={handleChange}
                    className="input"
                    placeholder="180000000"
                    min="0"
                    step="1000000"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Crear Propiedad'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
