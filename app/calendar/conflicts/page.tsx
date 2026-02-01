// app/calendar/conflicts/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Alert, AlertDescription } from '@/src/components/ui/alert';
import { Badge } from '@/src/components/ui/badge';
import { AlertCircle, Calendar, Clock, CheckCircle } from 'lucide-react';

interface ConflictEvent {
  id: string;
  lesson_title: string;
  lesson_start: string;
  lesson_end: string;
  work_event_title: string;
  work_event_start: string;
  work_event_end: string;
  conflict_type: string;
  resolution_status: 'unresolved' | 'resolved' | 'ignored';
  resolved_at?: string;
  resolution_action?: string;
}

export default function ConflictsPage() {
  const router = useRouter();
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    try {
      setLoading(true);
      const orgId = 'd52497c0-42a9-49b7-ba3b-849bffa27fc4'; // Your org ID
      const response = await fetch(`/api/calendar/conflicts?organizationId=${orgId}`);
      
      if (!response.ok) throw new Error('Failed to fetch conflicts');
      
      const data = await response.json();
      setConflicts(data.conflicts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (conflictId: string, action: string) => {
    try {
      const response = await fetch('/api/calendar/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflictId,
          action,
          organizationId: 'd52497c0-42a9-49b7-ba3b-849bffa27fc4',
        }),
      });

      if (!response.ok) throw new Error('Failed to resolve conflict');

      // Refresh conflicts
      await fetchConflicts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredConflicts = conflicts.filter(conflict => {
    if (filter === 'all') return true;
    if (filter === 'unresolved') return conflict.resolution_status === 'unresolved';
    if (filter === 'resolved') return conflict.resolution_status !== 'unresolved';
    return true;
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedule Conflicts</h1>
          <p className="text-gray-600 mt-2">
            Review and resolve conflicts between work meetings and homeschool lessons
          </p>
        </div>
        
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 font-medium"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Conflicts
        </button>
        
        <button
          onClick={() => setFilter('unresolved')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'unresolved'
              ? 'bg-yellow-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ⚠️ Unresolved
        </button>
        
        <button
          onClick={() => setFilter('resolved')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'resolved'
              ? 'bg-green-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ✓ Resolved
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Conflicts</p>
                <p className="text-3xl font-bold">{conflicts.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unresolved</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {conflicts.filter(c => c.resolution_status === 'unresolved').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-3xl font-bold text-green-600">
                  {conflicts.filter(c => c.resolution_status !== 'unresolved').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading conflicts...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredConflicts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {filter === 'all' ? 'No Conflicts Found' : `No ${filter} conflicts`}
            </h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' 
                ? 'Your schedule is conflict-free! 🎉'
                : `All conflicts in this category have been addressed.`
              }
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Conflicts
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conflicts List */}
      <div className="space-y-4">
        {filteredConflicts.map((conflict) => (
          <Card key={conflict.id} className={
            conflict.resolution_status === 'unresolved' 
              ? 'border-l-4 border-l-yellow-500' 
              : 'border-l-4 border-l-green-500'
          }>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={
                      conflict.resolution_status === 'unresolved'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }>
                      {conflict.resolution_status === 'unresolved' ? '⚠️ Needs Attention' : '✓ Resolved'}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatDate(conflict.lesson_start)}
                    </span>
                  </div>
                  <CardTitle className="text-lg">Scheduling Conflict</CardTitle>
                  <CardDescription>
                    {conflict.conflict_type === 'overlap' ? 'Time overlap detected' : 'Schedule conflict'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Lesson Details */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 mb-1">Homeschool Lesson</p>
                    <p className="text-blue-800">{conflict.lesson_title}</p>
                    <p className="text-sm text-blue-700 mt-1 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTime(conflict.lesson_start)} - {formatTime(conflict.lesson_end)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Work Event Details */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-purple-900 mb-1">Work Meeting</p>
                    <p className="text-purple-800">{conflict.work_event_title}</p>
                    <p className="text-sm text-purple-700 mt-1 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTime(conflict.work_event_start)} - {formatTime(conflict.work_event_end)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resolution Actions */}
              {conflict.resolution_status === 'unresolved' ? (
                <div className="flex gap-2 pt-2 border-t">
                  <button
                    onClick={() => handleResolve(conflict.id, 'reschedule_lesson')}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Reschedule Lesson
                  </button>
                  <button
                    onClick={() => handleResolve(conflict.id, 'keep_both')}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Keep Both
                  </button>
                  <button
                    onClick={() => handleResolve(conflict.id, 'ignore')}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Ignore
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t">
                  <p className="text-sm text-green-700">
                    ✓ Resolved {conflict.resolved_at && `on ${formatDate(conflict.resolved_at)}`}
                    {conflict.resolution_action && ` - ${conflict.resolution_action}`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Back to Calendar Link */}
      <div className="text-center pt-4">
        <Link 
          href="/calendar/connect"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Calendar Settings
        </Link>
      </div>
    </div>
  );
}