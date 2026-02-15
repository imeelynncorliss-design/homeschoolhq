// app/calendar/settings/[id]/page.tsx
import { createClient } from '@/src/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import CalendarSettingsClient from './CalendarSettingsClient';

interface CalendarSettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CalendarSettingsPage({
  params,
}: CalendarSettingsPageProps) {
  // Await params for Next.js 15 compatibility
  const { id } = await params;
  
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get calendar connection
  const { data: connection, error } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !connection) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Calendar Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage settings for {connection.calendar_name}
        </p>
      </div>

      <CalendarSettingsClient connection={connection} />
    </div>
  );
}