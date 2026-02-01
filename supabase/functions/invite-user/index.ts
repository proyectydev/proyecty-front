// Edge Function para invitar usuarios por email
// Esta función usa la Service Role Key de forma segura en el servidor

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticación del usuario que hace la petición
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado - Token requerido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extraer el token del header
    const token = authHeader.replace('Bearer ', '')
    
    // Crear cliente con Service Role para verificar el token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar que el usuario está autenticado usando el token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    console.log('User verification:', user?.email, userError?.message)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado - Sesión inválida', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener datos del request
    const { email, full_name, user_type, phone, document_type, document_number } = await req.json()

    // Validar datos requeridos
    if (!email || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email y nombre son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determinar la URL de redirección (producción o desarrollo)
    const siteUrl = Deno.env.get('SITE_URL') || 'https://app.proyecty.com'
    const redirectTo = `${siteUrl}/aceptar-invitacion`
    console.log('Redirect URL:', redirectTo)

    // Verificar si el usuario ya existe en auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(u => u.email === email)

    // Si el usuario existe y ya confirmó su email, no permitir reenviar
    if (existingAuthUser && existingAuthUser.email_confirmed_at) {
      return new Response(
        JSON.stringify({ error: 'Este usuario ya confirmó su cuenta y puede iniciar sesión.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Si existe pero NO ha confirmado, eliminar y volver a invitar (reenvío)
    if (existingAuthUser && !existingAuthUser.email_confirmed_at) {
      console.log('Usuario existe pero no confirmó, eliminando para reenviar:', email)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id)
      if (deleteError) {
        console.error('Error eliminando usuario para reenvío:', deleteError)
      }
    }

    // Enviar invitación por email (Supabase envía el correo automáticamente usando el SMTP configurado)
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: full_name,
        user_type: user_type || 'user',
      },
      redirectTo: redirectTo,
    })

    if (error) {
      console.error('Error inviting user:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Actualizar el registro existente en tabla users con el ID de auth y marcar como online_user
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        id: data.user.id,
        is_online_user: true,
      })
      .eq('email', email)

    if (updateError) {
      console.error('Error updating user:', updateError)
      // No fallamos, el usuario ya fue invitado
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitación enviada exitosamente. El usuario recibirá un correo para crear su contraseña.',
        userId: data.user.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
