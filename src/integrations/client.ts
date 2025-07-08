// Set up Google OAuth in your Supabase project dashboard under Authentication > Providers > Google.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eeifougcenzblqzcdqde.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlaWZvdWdjZW56YmxxemNkcWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MTAyNjgsImV4cCI6MjA2NzQ4NjI2OH0.-hHhnrqixR4hlZy821ewwdKvt80ABWeObKbfBiWFOKk';
//Testing
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 