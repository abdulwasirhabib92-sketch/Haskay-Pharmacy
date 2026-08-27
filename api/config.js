module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    hasConfig: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && 
               !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  });
};
