import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Simple security: only requests with secret key work
  if (req.headers['x-admin-key'] !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const { email, password, full_name, role, scheduled_start_time } = req.body
  
  // 1. Create auth user
  const { data: auth, error: authErr } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true
  })
  if (authErr) return res.status(400).json({ error: authErr.message })
  
  // 2. Add to staff table
  const { error: staffErr } = await supabase.from('staff').insert({
    user_id: auth.user.id, 
    full_name, 
    role, 
    scheduled_start_time
  })
  if (staffErr) return res.status(400).json({ error: staffErr.message })
  
  res.status(200).json({ success: true })
}
