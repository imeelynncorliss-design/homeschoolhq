// app/admin/vacations/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import EnhancedVacationManager from '@/components/admin/EnhancedVacationManager';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function VacationsPage() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrgId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: kid } = await supabase
          .from('kids')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        if (kid?.organization_id) {
          setOrganizationId(kid.organization_id);
        }
      }
    };
    
    fetchOrgId();
  }, []);

  if (!organizationId) {
    return <div className="p-6">Loading...</div>;
  }

  return <EnhancedVacationManager organizationId={organizationId} />;
}