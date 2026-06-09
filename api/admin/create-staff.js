import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Safe CORS Headers Configuration
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 1. Safe Token extraction verification
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No login token provided' })

  // System Environment Check
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'System environment strings are missing on server production dashboard.' })
  }

  // 2. Client setups
  const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  const adminSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // 3. User extraction validation check
  const { data: authData, error: userErr } = await userSupabase.auth.getUser()
  if (userErr || !authData?.user) {
    return res.status(401).json({ error: 'User context expired or user verification verification failed' })
  }

  // Look up staff role details matching active ID identifier
  const { data: staffCheck, error: staffCheckErr } = await adminSupabase
    .from('staff')
    .select('role')
    .eq('user_id', authData.user.id)
    .single()

  if (staffCheckErr || staffCheck?.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create staff' })
  }

  // 4. Everything matches. Create the record
  const { email, password, full_name, role, scheduled_start_time } = req.body
  
  const { data: auth, error: authErr } = await adminSupabase.auth.admin.createUser({
    email, password, email_confirm: true
  })
  if (authErr) return res.status(400).json({ error: authErr.message })
  
  const { error: staffErr } = await adminSupabase.from('staff').insert({
    user_id: auth.user.id, 
    full_name, 
    role: role || 'staff', 
    scheduled_start_time: scheduled_start_time || null
  })
  
  if (staffErr) {
    // Rollback authentication record creation if database profile insert breaks
    await adminSupabase.auth.admin.deleteUser(auth.user.id)
    return res.status(400).json({ error: staffErr.message })
  }
  
  res.status(200).json({ success: true, user_id: auth.user.id })
}
