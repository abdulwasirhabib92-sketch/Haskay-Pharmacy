import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 1. Get the logged-in user's token from frontend
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No login token provided' })

  // 2. Create 2 Supabase clients: one as the user, one as admin
  const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  const adminSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // 3. Check if the logged-in user is actually an admin
  const { data: { user } } = await userSupabase.auth.getUser()
  const { data: staffCheck } = await adminSupabase
    .from('staff')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (staffCheck?.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create staff' })
  }

  // 4. If we get here, user is verified admin. Create the new staff
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
    await adminSupabase.auth.admin.deleteUser(auth.user.id)
    return res.status(400).json({ error: staffErr.message })
  }
  
  res.status(200).json({ success: true, user_id: auth.user.id })
}
