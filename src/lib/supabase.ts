// src/lib/supabase.ts
import { createClient } from './supabase/client';

export { createClient };
export const supabase = createClient();