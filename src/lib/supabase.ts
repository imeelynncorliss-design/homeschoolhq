// src/lib/supabase.ts
import { createClient } from './supabase/client';

export { createClient };

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = createClient();
    return client[prop as keyof typeof client];
  },
});