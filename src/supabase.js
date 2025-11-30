// src/supabase.js
import { createClient } from '@supabase/supabase-js';

// metti qui i tuoi valori REALI
const supabaseUrl = 'https://aradcjqtlvoaeaaahlid.supabase.co';  // il tuo Project URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyYWRjanF0bHZvYWVhYWFobGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjQ5MTIsImV4cCI6MjA4MDAwMDkxMn0.HJaWmzceGLA17_wEo2OpAn8ST78iQQLiLjgBg7NLTm4';
export const supabase = createClient(supabaseUrl, supabaseKey);
