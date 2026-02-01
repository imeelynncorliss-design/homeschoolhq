// app/calendar/connect/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Trash2,
  RefreshCw,
  Settings,
  ArrowRight,
  XCircle  
} from 'lucide-react';
import type { CalendarConnection } from '@/src/types/calendar';

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function CalendarConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // NEW: Individual sync feedback per connection
const [syncFeedback, setSyncFeedback] = useState<Record<string, {
  type: 'success' | 'error' | null;
  message: string;
}>>({});
  // Handle OAuth callback messages
  useEffect(() => {
    const oauthError = searchParams.get('error');
    const oauthSuccess = searchParams.get('success');

    if (oauthError) {
      setError(`Connection failed: ${oauthError}`);
    } else if (oauthSuccess) {
      setSuccess('Calendar connected successfully!');
      // Refresh connections
      loadConnections();
    }
  }, [searchParams]);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/calendar/connections?organizationId=${getCurrentOrgId()}`
      );
      const data = await response.json();
      setConnections(data.connections || []);
    } catch (err: any) {
      setError('Failed to load calendar connections');
    } finally {
      setLoading(false);
    }
  };

  const connectGoogle = async () => {
    try {
      const response = await fetch('/api/calendar/oauth/google', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err: any) {
      setError('Failed to initiate Google Calendar connection');
    }
  };

  const connectOutlook = async () => {
    try {
      const response = await fetch('/api/calendar/oauth/outlook', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err: any) {
      setError('Failed to initiate Outlook connection');
    }
  };

  const syncConnection = async (connectionId: string) => {
    try {
      setSyncing(connectionId);
      setSyncFeedback(prev => ({
        ...prev,
        [connectionId]: { type: null, message: '' }
      }));
  
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });
      
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || 'Sync failed');
      }
      
      setSyncFeedback(prev => ({
        ...prev,
        [connectionId]: {
          type: 'success',
          message: data.message || `Successfully synced! Processed ${data.eventsProcessed || 0} events.`
        }
      }));
      
      await loadConnections();
      
      setTimeout(() => {
        setSyncFeedback(prev => ({
          ...prev,
          [connectionId]: { type: null, message: '' }
        }));
      }, 5000);
  
    } catch (err: any) {
      setSyncFeedback(prev => ({
        ...prev,
        [connectionId]: {
          type: 'error',
          message: err.message || 'Failed to sync calendar. Please try again.'
        }
      }));
  
      setTimeout(() => {
        setSyncFeedback(prev => ({
          ...prev,
          [connectionId]: { type: null, message: '' }
        }));
      }, 5000);
    } finally {
      setSyncing(null);
    }
  };

  const disconnectCalendar = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this calendar?')) {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/connections/${connectionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to disconnect');
      
      setSuccess('Calendar disconnected');
      loadConnections();
    } catch (err: any) {
      setError('Failed to disconnect calendar');
    }
  };

  const getCurrentOrgId = () => {
    // Replace with actual org ID from context/state
    return 'd52497c0-42a9-49b7-ba3b-849bffa27fc4';
  };

  const getProviderIcon = (provider: string) => {
    return provider === 'google' ? (
      <div className="w-5 h-5 bg-blue-500 rounded" />
    ) : (
      <div className="w-5 h-5 bg-blue-600 rounded" />
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      completed: { color: 'bg-green-100 text-green-800', label: 'Active' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Error' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      syncing: { color: 'bg-blue-100 text-blue-800', label: 'Syncing' },
    };
  
    const variant = variants[status] || variants.pending;
    return (
      <Badge className={variant.color}>
        {variant.label}
      </Badge>
    );
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Work Calendar Integration</h1>
          <p className="text-gray-600 mt-2">
            Connect your Google Calendar or Outlook to automatically detect conflicts
            with your homeschool schedule
          </p>
        </div>
        
        {/* Back to Dashboard Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 font-medium"
        >
          ← Back to Dashboard
        </button>
      </div>
  
      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
  
      {success && !connections.length && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Success Guide - Shows after connection */}
      {success && connections.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              🎉 Calendar Connected Successfully!
            </CardTitle>
            <CardDescription className="text-green-700">
              Your work calendar is now connected. Here's what happens next:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-medium text-green-900">Automatic Sync</h3>
                <p className="text-sm text-green-700">
                  Your work calendar syncs every 15 minutes. You can also click "Sync Now" below anytime.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-medium text-green-900">Create Your Lessons</h3>
                <p className="text-sm text-green-700">
                  Go to your lesson planner and schedule your homeschool lessons for the week.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-medium text-green-900">Check for Conflicts</h3>
                <p className="text-sm text-green-700">
                  We'll automatically detect when work meetings conflict with lessons and help you resolve them.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-green-200">
              <Button 
                onClick={() => router.push('/dashboard')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                onClick={() => router.push('/calendar/conflicts')}
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-50"
              >
                View Conflicts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connect New Calendar */}
      {connections.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Calendar</CardTitle>
            <CardDescription>
              Add a work calendar to enable automatic conflict detection
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button onClick={connectGoogle} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Calendar className="w-4 h-4" />
              Connect Google Calendar
            </Button>
            <Button onClick={connectOutlook} variant="outline" className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border-gray-300">
              <Calendar className="w-4 h-4" />
              Connect Outlook
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connected Calendars */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Calendars</CardTitle>
          <CardDescription>
            Manage your connected work calendars
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No calendars connected yet. Connect your work calendar above to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div key={connection.id} className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getProviderIcon(connection.provider)}
                    <div>
                      <div className="font-medium">{connection.calendar_name}</div>
                      <div className="text-sm text-gray-600">
                        {connection.provider_account_email}
                      </div>
                      {connection.last_sync_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(connection.last_sync_status)}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => syncConnection(connection.id)}
                      disabled={syncing === connection.id}
                    >
                      {syncing === connection.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/calendar/settings/${connection.id}`)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => disconnectCalendar(connection.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
            </div>
          </div>

          {/* NEW: Prominent Sync Section for Pending Connections */}
          {connection.last_sync_status === 'pending' && (
            <div className="ml-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 mb-1">
                    Initial Sync Required
                  </h3>
                  <p className="text-sm text-yellow-800 mb-3">
                    Your calendar is connected but needs to complete its first sync to activate. 
                    This will fetch your work events and enable conflict detection.
                  </p>
                  
                  <Button
                    onClick={() => syncConnection(connection.id)}
                    disabled={syncing === connection.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {syncing === connection.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* NEW: Inline Sync Feedback */}
          {syncFeedback[connection.id]?.type && (
            <div
              className={`ml-4 flex items-start gap-2 p-3 rounded-lg border ${
                syncFeedback[connection.id].type === 'success'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
              role="alert"
            >
              {syncFeedback[connection.id].type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-sm ${
                  syncFeedback[connection.id].type === 'success'
                    ? 'text-green-800'
                    : 'text-red-800'
                }`}
              >
                {syncFeedback[connection.id].message}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )}
</CardContent>
</Card>

    {/* What You'll See Section - NEW */}
{connections.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <span className="text-2xl">👀</span>
        What You'll See
      </CardTitle>
      <CardDescription>
        Here's what happens after connecting your work calendar
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Automatic Sync */}
      <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-3xl">🔄</div>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-1">Automatic Sync (Every 15 Minutes)</h3>
          <p className="text-sm text-blue-800">
            Your work events sync automatically in the background. You don't need to do anything!
          </p>
        </div>
      </div>

      {/* Conflict Warnings */}
      <div className="flex gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="text-3xl">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900 mb-1">Conflict Warnings</h3>
          <p className="text-sm text-yellow-800 mb-2">
            When you schedule a lesson that conflicts with a work meeting, you'll see a warning like:
          </p>
          <div className="bg-white p-3 rounded border border-yellow-300 text-sm">
            <span className="font-semibold text-red-600">⚠️ Conflict:</span> This lesson overlaps with "Team Meeting" (2:00 PM - 3:00 PM)
          </div>
        </div>
      </div>

      {/* Auto-Block Feature */}
      <div className="flex gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="text-3xl">🚫</div>
        <div className="flex-1">
          <h3 className="font-semibold text-purple-900 mb-1">Auto-Block Work Time (Optional)</h3>
          <p className="text-sm text-purple-800 mb-2">
            Enable in calendar settings to automatically block work meeting times in your homeschool calendar
          </p>
          <div className="bg-white p-3 rounded border border-purple-300 text-sm">
            Calendar will show: <span className="font-semibold">🚫 Team Meeting (Work)</span> - preventing lesson scheduling during that time
          </div>
        </div>
      </div>

      {/* What You WON'T See */}
      <div className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-300">
        <div className="text-3xl">ℹ️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">What You WON'T See</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Work events won't appear as regular lessons in your schedule</li>
            <li>Your work calendar won't be changed or modified in any way</li>
            <li>HomeschoolHQ lessons won't be added to your work calendar</li>
          </ul>
        </div>
      </div>

      {/* View Conflicts Link */}
      <div className="pt-2 border-t">
        <Link 
          href="/calendar/conflicts"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          View All Conflicts →
        </Link>
      </div>
    </CardContent>
  </Card>
)}
      {/* Feature Info */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
              1
            </div>
            <div>
              <h3 className="font-semibold mb-1">Connect Your Work Calendar</h3>
              <p className="text-sm text-gray-600">
                Securely connect Google Calendar or Outlook to HomeschoolHQ
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
              2
            </div>
            <div>
              <h3 className="font-semibold mb-1">Automatic Sync Every 15 Minutes</h3>
              <p className="text-sm text-gray-600">
                Work events sync automatically in the background - no manual action needed
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
              3
            </div>
            <div>
              <h3 className="font-semibold mb-1">Get Conflict Warnings</h3>
              <p className="text-sm text-gray-600">
                See alerts when scheduling lessons during work meetings - helping you avoid double-booking
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}