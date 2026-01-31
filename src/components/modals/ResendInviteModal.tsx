import { useState } from 'react'
import { X, Send, MessageCircle, Mail, Copy, Check, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '../../types/database'

interface ResendInviteModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
}

export function ResendInviteModal({ isOpen, onClose, user }: ResendInviteModalProps) {
  const queryClient = useQueryClient()
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleClose = () => {
    setEmailSent(false)
    setEmailError('')
    setCopied(false)
    onClose()
  }

  // Generar el mensaje de invitación
  const getInviteMessage = () => {
    if (!user) return ''
    const baseUrl = window.location.origin
    return `¡Hola ${user.full_name}! 👋

Te invitamos a registrarte en Proyecty, nuestra plataforma de gestión hipotecaria.

📧 Tu email registrado: ${user.email}

🔗 Para crear tu contraseña y acceder, visita:
${baseUrl}/registro

Si tienes alguna pregunta, no dudes en contactarnos.

¡Gracias por confiar en nosotros! 🏠`
  }

  // Enviar invitación por email usando la Edge Function
  const handleSendEmailInvite = async () => {
    if (!user) return
    
    setSendingEmail(true)
    setEmailError('')
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('No hay sesión activa. Por favor, cierra sesión y vuelve a entrar.')
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          user_type: user.user_type,
          document_type: user.document_type,
          document_number: user.document_number,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar invitación')
      }

      setEmailSent(true)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      
    } catch (err) {
      console.error('Error enviando email:', err)
      setEmailError(err instanceof Error ? err.message : 'Error al enviar email')
    } finally {
      setSendingEmail(false)
    }
  }

  // Abrir WhatsApp con el mensaje
  const handleWhatsApp = () => {
    if (!user) return
    const message = encodeURIComponent(getInviteMessage())
    const phone = user.phone?.replace(/\D/g, '') || ''
    const whatsappUrl = phone 
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}`
    window.open(whatsappUrl, '_blank')
  }

  // Copiar mensaje al portapapeles
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(getInviteMessage())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Error al copiar:', err)
    }
  }

  // Abrir cliente de email
  const handleEmail = () => {
    if (!user) return
    const subject = encodeURIComponent('Invitación a Proyecty - Plataforma de Gestión Hipotecaria')
    const body = encodeURIComponent(getInviteMessage())
    window.open(`mailto:${user.email}?subject=${subject}&body=${body}`)
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Send className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Reenviar Invitación</h2>
                <p className="text-sm text-gray-500">{user.full_name}</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6">
            <p className="text-gray-600 mb-4 text-center">
              Este usuario aún no ha creado su contraseña. Envíale la invitación nuevamente:
            </p>

            {/* Email Error */}
            {emailError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                {emailError}
              </div>
            )}

            {/* Éxito de envío de email */}
            {emailSent && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>¡Email de invitación enviado correctamente!</span>
              </div>
            )}

            {/* Botones de acción */}
            <div className="space-y-3">
              {/* Enviar Invitación Automática */}
              <button 
                onClick={handleSendEmailInvite}
                disabled={sendingEmail || emailSent}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                  emailSent 
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando invitación...
                  </>
                ) : emailSent ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Invitación Enviada
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar por Email
                  </>
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">o enviar manualmente</span>
                </div>
              </div>

              {/* WhatsApp */}
              <button 
                onClick={handleWhatsApp}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Enviar por WhatsApp
              </button>

              {/* Email Manual */}
              <button 
                onClick={handleEmail}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5" />
                Abrir Cliente de Email
              </button>

              {/* Copiar */}
              <button 
                onClick={handleCopyMessage}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-green-600">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copiar mensaje de invitación
                  </>
                )}
              </button>
            </div>

            <button 
              onClick={handleClose}
              className="btn-secondary w-full mt-4"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
