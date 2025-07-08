// Set up Google OAuth in your Supabase project dashboard under Authentication > Providers > Google.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eeifougcenzblqzcdqde.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 