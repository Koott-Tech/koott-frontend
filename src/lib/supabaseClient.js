import { createClient } from '@supabase/supabase-js';

// Singleton Supabase client utility
let supabaseClientInstance = null;

export const getSupabaseClient = () => {
  if (!supabaseClientInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey) {
      supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey);
    } else {
      console.warn('Supabase environment variables not found');
    }
  }
  
  return supabaseClientInstance;
};
