// Vercel Serverless Function to expose Supabase environment variables to the frontend
// Reads ANON_KEY and SUPABASE_URL configured in your Vercel Dashboard

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://ethjhohikzkjkvbqzvgm.supabase.co';
  const supabaseAnonKey = process.env.ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aGpob2hpa3pramt2YnF6dmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTUwODAsImV4cCI6MjEwNzU3MTA4MH0.qYb1h9R2cbm76tJYzF6gxEfi2MlI2KKE7Usf9SeA1-E';

  res.status(200).json({
    supabaseUrl: supabaseUrl,
    supabaseAnonKey: supabaseAnonKey
  });
}
