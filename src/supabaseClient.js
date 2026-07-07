import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://myupglfifbjgtmeteubb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dXBnbGZpZmJqZ3RtZXRldWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNDExOTMsImV4cCI6MjA5NzYxNzE5M30.Asjux2UhSY5seNnVeKF4EFlBvJkmJnDKxLlPGLiqK7c'

export const supabase = createClient(supabaseUrl, supabaseKey)