// Supabase Configuration & Client Initialization for Aurelia Bistro & Lounge
// Supports dynamic Vercel Environment Variables (ANON_KEY & SUPABASE_URL) via /api/config
// with instant local fallback for offline/local development.

(function () {
  let SUPABASE_URL = 'https://ethjhohikzkjkvbqzvgm.supabase.co';
  let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aGpob2hpa3pramt2YnF6dmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTUwODAsImV4cCI6MjEwNzU3MTA4MH0.qYb1h9R2cbm76tJYzF6gxEfi2MlI2KKE7Usf9SeA1-E';

  window.AURELIA_CONFIG = {
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY
  };

  let clientInstance = null;

  function createClient(url, key) {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        clientInstance = window.supabase.createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        window.supabaseClient = clientInstance;
        return clientInstance;
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
      }
    }
    return null;
  }

  // Initialize immediately with default/fallback
  if (window.supabase) {
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // Fetch Vercel environment variables from /api/config if hosted on Vercel
  fetch('/api/config')
    .then(res => {
      if (res.ok) return res.json();
      throw new Error('Not running on Vercel or /api/config not available');
    })
    .then(cfg => {
      if (cfg && cfg.supabaseAnonKey && cfg.supabaseAnonKey !== SUPABASE_ANON_KEY) {
        SUPABASE_URL = cfg.supabaseUrl || SUPABASE_URL;
        SUPABASE_ANON_KEY = cfg.supabaseAnonKey;
        window.AURELIA_CONFIG.supabaseUrl = SUPABASE_URL;
        window.AURELIA_CONFIG.supabaseAnonKey = SUPABASE_ANON_KEY;
        // Re-initialize with Vercel environment variable
        createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
    })
    .catch(() => {
      // Local development or static host without /api/config - fallback is active
    });

  window.getSupabaseClient = function () {
    if (!clientInstance && window.supabase) {
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return clientInstance;
  };
})();
