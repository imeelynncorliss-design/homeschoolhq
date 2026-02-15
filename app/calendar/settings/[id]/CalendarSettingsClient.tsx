// CalendarSettingsClient.tsx - Updated with darker headings and back button
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Switch } from '@/src/components/ui/switch';
import { Badge } from '@/src/components/ui/badge';
import { Alert, AlertDescription } from '@/src/components/ui/alert';
import { 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  ArrowLeft,
  RefreshCw,
  Trash2
} from 'lucide-react';

interface CalendarSettingsClientProps {
  connection: any;
}

export default function CalendarSettingsClient({ connection }: CalendarSettingsClientProps) {
  const router = useRouter();
  const [settings, setSettings] = useState({
    sync_enabled: connection.sync_enabled ?? true,
    auto_block_enabled: connection.auto_block_enabled ?? false,
    conflict_notification_enabled: connection.conflict_notification_enabled ?? true,
    push_lessons_to_calendar: connection.push_lessons_to_calendar ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggle = async (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    try {
      setSaving(true);
      const response = await fetch(`/api/calendar/settings/${connection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) throw new Error('Failed to update settings');
      
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
      setSettings(prev => ({ ...prev, [key]: !value }));
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch(`/api/calendar/sync/${connection.id}`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Sync failed');
      
      setMessage({ type: 'success', text: 'Calendar synced successfully' });
      setTimeout(() => {
        router.refresh();
        setMessage(null);
      }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sync calendar' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this calendar? This will remove all synced events.')) {
      return;
    }

    try {
      setDisconnecting(true);
      const response = await fetch(`/api/calendar/disconnect/${connection.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to disconnect');
      
      router.push('/calendar/connect?disconnected=true');
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect calendar' });
      setDisconnecting(false);
    }
  };

  const getStatusBadge = () => {
    const status = connection.last_sync_status;
    const variants: Record<string, { color: string; label: string }> = {
      completed: { color: 'bg-green-100 text-green-800', label: 'Active' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Error' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      syncing: { color: 'bg-blue-100 text-blue-800', label: 'Syncing' },
    };
    
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.color}>{variant.label}</Badge>;
  };

  const isTokenExpired = connection.token_expires_at && new Date(connection.token_expires_at) < new Date();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/calendar/connect')}
          className="flex items-center gap-2 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Calendars
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-white">Calendar Settings</h1>
        <p className="text-gray-400 mt-2">
          Manage sync preferences and connection settings
        </p>
      </div>

      {/* Messages */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} 
               className={message.type === 'success' ? 'border-green-200 bg-green-50' : ''}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : ''}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Token Expiration Warning */}
      {isTokenExpired && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your calendar connection has expired. Please reconnect to continue syncing.
          </AlertDescription>
        </Alert>
      )}

      {/* Calendar Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900 text-xl">Calendar Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Provider</div>
            <div className="text-gray-900 capitalize">{connection.provider}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Calendar Name</div>
            <div className="text-gray-900">{connection.calendar_name}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Email</div>
            <div className="text-gray-900">{connection.provider_account_email}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Last Synced</div>
            <div className="flex items-center gap-3">
              <span className="text-gray-900">
                {connection.last_sync_at 
                  ? new Date(connection.last_sync_at).toLocaleString()
                  : 'Never'}
              </span>
              {getStatusBadge()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900 text-xl">Sync Settings</CardTitle>
          <CardDescription>Control how your calendar syncs with HomeschoolHQ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-gray-900">Enable Sync</div>
              <div className="text-sm text-gray-600">
                Automatically sync events from your work calendar
              </div>
            </div>
            <Switch
              checked={settings.sync_enabled}
              onCheckedChange={(checked) => handleToggle('sync_enabled', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-gray-900">Auto-Block Work Events</div>
              <div className="text-sm text-gray-600">
                Automatically block work meeting times in your homeschool calendar
              </div>
            </div>
            <Switch
              checked={settings.auto_block_enabled}
              onCheckedChange={(checked) => handleToggle('auto_block_enabled', checked)}
              disabled={saving || !settings.sync_enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-gray-900">Conflict Notifications</div>
              <div className="text-sm text-gray-600">
                Get notified when work meetings conflict with lessons
              </div>
            </div>
            <Switch
              checked={settings.conflict_notification_enabled}
              onCheckedChange={(checked) => handleToggle('conflict_notification_enabled', checked)}
              disabled={saving || !settings.sync_enabled}
            />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div className="flex-1">
              <div className="font-medium text-gray-900">Push Lessons to Work Calendar</div>
              <div className="text-sm text-gray-600">
                Coming soon: Add homeschool lessons to your work calendar
              </div>
            </div>
            <Switch
              checked={settings.push_lessons_to_calendar}
              disabled={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900 text-xl">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleSync}
            disabled={syncing || !settings.sync_enabled}
            className="w-full"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>

          <Button
            onClick={handleDisconnect}
            disabled={disconnecting}
            variant="destructive"
            className="w-full"
          >
            {disconnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Disconnect Calendar
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}