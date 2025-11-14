import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ukfkvalvslffuluianbz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrZmt2YWx2c2xmZnVsdWlhbmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NTY4ODksImV4cCI6MjA3NzQzMjg4OX0.exOEQd8HIBKMi3Tb7nFNGDjnMq5Dh0HxjDbNpxuQb2k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);