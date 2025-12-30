'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import LessonGenerator from '@/components/LessonGenerator'
import CurriculumImporter from '@/components/CurriculumImporter';

const DURATION_OPTIONS = [
  '15 min',
  '30 min',
  '45 min',
  '1 hour',
  '1.5 hours',
  '2 hours',
  '2.5 hours',
  '3 hours'
];

export default function Dashboard() {
  const [showGenerator, setShowGenerator] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showAddKidForm, setShowAddKidForm] = useState(false);
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kids, setKids] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  
  // Collapsible section state
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set());
  const [collapsedSubjects, setCollapsedSubjects] = useState<Set<string>>(new Set());
  
  // Kid form state
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [grade, setGrade] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editGrade, setEditGrade] = useState('')
  
  // Lesson form state
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [lessonSubject, setLessonSubject] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDescription, setLessonDescription] = useState('')
  const [lessonDate, setLessonDate] = useState('')
  const [addingLesson, setAddingLesson] = useState(false)
  
  // Lesson editing state
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [editLessonTitle, setEditLessonTitle] = useState('')
  const [editLessonSubject, setEditLessonSubject] = useState('')
  const [editLessonDescription, setEditLessonDescription] = useState('')
  const [editLessonDate, setEditLessonDate] = useState('')
  const [editLessonDuration, setEditLessonDuration] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (selectedKid) {
      loadLessons(selectedKid)
    }
  }, [selectedKid])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
    } else {
      setUser(user)
      loadKids()
    }
    setLoading(false)
  }

  const loadKids = async () => {
    const { data } = await supabase
      .from('kids')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) {
      setKids(data)
      if (data.length > 0 && !selectedKid) {
        setSelectedKid(data[0].id)
      }
    }
  }

  const loadLessons = async (kidId: string) => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('kid_id', kidId)
      .order('lesson_date', { ascending: false })
    
    if (data) setLessons(data)
  }

  const addKid = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)

    const { data, error } = await supabase
      .from('kids')
      .insert([{ 
        name, 
        age: age ? parseInt(age) : null, 
        grade 
      }])
      .select()

    if (!error && data) {
      setName('')
      setAge('')
      setGrade('')
      setShowAddKidForm(false)
      loadKids()
      if (data.length > 0) setSelectedKid(data[0].id)
    }
    setAdding(false)
  }

  const deleteKid = async (id: string, kidName: string) => {
    if (confirm(`Delete ${kidName}? This will also delete all their lessons.`)) {
      await supabase.from('kids').delete().eq('id', id)
      if (selectedKid === id) setSelectedKid(kids[0]?.id || null)
      loadKids()
    }
  }

  const startEdit = (kid: any) => {
    setEditingId(kid.id)
    setEditName(kid.name)
    setEditAge(kid.age?.toString() || '')
    setEditGrade(kid.grade || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async (id: string) => {
    await supabase
      .from('kids')
      .update({ 
        name: editName, 
        age: editAge ? parseInt(editAge) : null, 
        grade: editGrade 
      })
      .eq('id', id)
    
    setEditingId(null)
    loadKids()
  }

  const addLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedKid) return
    
    setAddingLesson(true)

    await supabase
      .from('lessons')
      .insert([{
        kid_id: selectedKid,
        subject: lessonSubject,
        title: lessonTitle,
        description: lessonDescription,
        lesson_date: lessonDate || null
      }])

    setLessonSubject('')
    setLessonTitle('')
    setLessonDescription('')
    setLessonDate('')
    setShowLessonForm(false)
    setAddingLesson(false)
    loadLessons(selectedKid)
  }

  const startEditLesson = (lesson: any) => {
    setEditingLessonId(lesson.id)
    setEditLessonTitle(lesson.title)
    setEditLessonSubject(lesson.subject)
    setEditLessonDescription(lesson.description || '')
    setEditLessonDate(lesson.lesson_date || '')
    setEditLessonDuration(lesson.duration || '')
  }

  const cancelEditLesson = () => {
    setEditingLessonId(null)
  }

  const saveEditLesson = async (id: string) => {
    await supabase
      .from('lessons')
      .update({
        title: editLessonTitle,
        subject: editLessonSubject,
        description: editLessonDescription,
        lesson_date: editLessonDate || null,
        duration: editLessonDuration || null
      })
      .eq('id', id)
    
    setEditingLessonId(null)
    if (selectedKid) loadLessons(selectedKid)
  }

  const toggleComplete = async (lessonId: string, currentStatus: boolean) => {
    await supabase
      .from('lessons')
      .update({ completed: !currentStatus })
      .eq('id', lessonId)
    
    if (selectedKid) loadLessons(selectedKid)
  }

  const deleteLesson = async (id: string) => {
    if (confirm('Delete this lesson?')) {
      await supabase.from('lessons').delete().eq('id', id)
      if (selectedKid) loadLessons(selectedKid)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Helper function to determine lesson status
  const getLessonStatus = (lesson: any) => {
    if (lesson.completed) return 'Completed';
    
    if (lesson.lesson_date) {
      const lessonDate = new Date(lesson.lesson_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      lessonDate.setHours(0, 0, 0, 0);
      
      if (lessonDate <= today) return 'In Progress';
    }
    
    return 'Not Started';
  };

  // Group lessons by status, then by subject
const groupedLessons = () => {
  const groups: { [status: string]: { [subject: string]: any[] } } = {
    'Not Started': {},
    'In Progress': {},
    'Completed': {}
  };

  lessons.forEach(lesson => {
    const status = getLessonStatus(lesson);
    const subject = lesson.subject || 'Other';
    
    if (!groups[status][subject]) {
      groups[status][subject] = [];
    }
    groups[status][subject].push(lesson);
  });

  // Sort lessons within each subject group numerically by lesson number
  Object.keys(groups).forEach(status => {
    Object.keys(groups[status]).forEach(subject => {
      groups[status][subject].sort((a, b) => {
        const numA = parseInt(a.title.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.title.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
    });
  });

  return groups;
};

  const toggleStatus = (status: string) => {
    const newCollapsed = new Set(collapsedStatuses);
    if (newCollapsed.has(status)) {
      newCollapsed.delete(status);
    } else {
      newCollapsed.add(status);
    }
    setCollapsedStatuses(newCollapsed);
  };

  const toggleSubject = (statusSubjectKey: string) => {
    const newCollapsed = new Set(collapsedSubjects);
    if (newCollapsed.has(statusSubjectKey)) {
      newCollapsed.delete(statusSubjectKey);
    } else {
      newCollapsed.add(statusSubjectKey);
    }
    setCollapsedSubjects(newCollapsed);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const selectedKidData = kids.find(k => k.id === selectedKid)
  const grouped = groupedLessons();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">HomeschoolHQ Dashboard</h1>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
          <p className="text-gray-900">Welcome, {user?.email}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Kids Section */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Children</h2>
              <p className="text-sm text-gray-600 mb-3">👉 Click a child's name to view their lessons</p>
              
              {kids.length === 0 ? (
                <p className="text-gray-600 mb-4">No children added yet.</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {kids.map((kid) => (
                    <div key={kid.id} className="border rounded p-3">
                      {editingId === kid.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 border rounded text-gray-900 text-sm"
                          />
                          <input
                            type="number"
                            value={editAge}
                            onChange={(e) => setEditAge(e.target.value)}
                            className="w-full px-2 py-1 border rounded text-gray-900 text-sm"
                          />
                          <input
                            type="text"
                            value={editGrade}
                            onChange={(e) => setEditGrade(e.target.value)}
                            className="w-full px-2 py-1 border rounded text-gray-900 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(kid.id)}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div 
                              className="cursor-pointer flex-1 hover:bg-blue-50 transition-colors"
                              onClick={() => setSelectedKid(kid.id)}
                            >
                              <h3 className={`font-semibold ${selectedKid === kid.id ? 'text-blue-600' : 'text-gray-900'} ${selectedKid === kid.id ? 'bg-blue-50 p-2 rounded' : ''}`}>
                                {kid.name}
                              </h3>
                              <p className="text-gray-600 text-sm">
                                {kid.age && `Age: ${kid.age}`}
                                {kid.age && kid.grade && ' • '}
                                {kid.grade && `Grade: ${kid.grade}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(kid)}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteKid(kid.id, kid.name)}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add Child Button/Form */}
              <button
                onClick={() => setShowAddKidForm(!showAddKidForm)}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mb-3"
              >
                {showAddKidForm ? '− Cancel' : '+ Add a Child'}
              </button>
              
              {showAddKidForm && (
                <form onSubmit={addKid} className="space-y-3 p-4 border rounded bg-gray-50">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-gray-900"
                    placeholder="Name *"
                    required
                  />
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-gray-900"
                    placeholder="Age"
                  />
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-gray-900"
                    placeholder="Grade"
                  />
                  <button
                    type="submit"
                    disabled={adding}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                  >
                    {adding ? 'Adding...' : 'Add Child'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Lessons Section */}
          <div className="md:col-span-2">
            {selectedKidData ? (
              <>
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      Lessons for {selectedKidData.name}
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowLessonForm(!showLessonForm)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        {showLessonForm ? 'Cancel' : '+ Add Lesson'}
                      </button>
                      <button
                        onClick={() => setShowGenerator(true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded hover:from-purple-700 hover:to-blue-700"
                      >
                        📚 Lesson Generator
                      </button>
                      <button
                        onClick={() => setShowImporter(true)}
                        className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-teal-700 flex items-center gap-2"
                      >
                        📥 Import Curriculum
                      </button>
                    </div>
                  </div>

                  {showLessonForm && (
                    <form onSubmit={addLesson} className="space-y-3 mb-6 p-4 border rounded">
                      <input
                        type="text"
                        value={lessonSubject}
                        onChange={(e) => setLessonSubject(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-gray-900"
                        placeholder="Subject (e.g., Math, Science) *"
                        required
                      />
                      <input
                        type="text"
                        value={lessonTitle}
                        onChange={(e) => setLessonTitle(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-gray-900"
                        placeholder="Title *"
                        required
                      />
                      <textarea
                        value={lessonDescription}
                        onChange={(e) => setLessonDescription(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-gray-900"
                        placeholder="Description"
                        rows={3}
                      />
                      <input
                        type="date"
                        value={lessonDate}
                        onChange={(e) => setLessonDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-gray-900"
                      />
                      <button
                        type="submit"
                        disabled={addingLesson}
                        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                      >
                        {addingLesson ? 'Adding...' : 'Add Lesson'}
                      </button>
                    </form>
                  )}

                  {lessons.length === 0 ? (
                    <p className="text-gray-600">No lessons yet. Click "+ Add Lesson" to start!</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Group by Status, then by Subject */}
                      {Object.entries(grouped).map(([status, subjects]) => {
                        const statusLessonCount = Object.values(subjects).flat().length;
                        if (statusLessonCount === 0) return null;
                        
                        const isStatusCollapsed = collapsedStatuses.has(status);
                        
                        return (
                          <div key={status} className="border rounded-lg">
                            {/* Status Header */}
                            <button
                              onClick={() => toggleStatus(status)}
                              className={`w-full px-4 py-3 flex items-center justify-between font-semibold text-left ${
                                status === 'Completed' ? 'bg-green-50 text-green-800' :
                                status === 'In Progress' ? 'bg-yellow-50 text-yellow-800' :
                                'bg-blue-50 text-blue-800'
                              } hover:opacity-80 transition-opacity rounded-t-lg`}
                            >
                              <span className="flex items-center gap-2">
                                <span>{isStatusCollapsed ? '▶' : '▼'}</span>
                                <span>{status} ({statusLessonCount})</span>
                              </span>
                            </button>
                            
                            {/* Subject Groups */}
                            {!isStatusCollapsed && (
                              <div className="p-2">
                                {Object.entries(subjects).map(([subject, subjectLessons]) => {
                                  const statusSubjectKey = `${status}-${subject}`;
                                  const isSubjectCollapsed = collapsedSubjects.has(statusSubjectKey);
                                  
                                  return (
                                    <div key={statusSubjectKey} className="mb-2">
                                      {/* Subject Header */}
                                      <button
                                        onClick={() => toggleSubject(statusSubjectKey)}
                                        className="w-full px-3 py-2 flex items-center justify-between text-left bg-gray-50 hover:bg-gray-100 rounded font-medium text-gray-700"
                                      >
                                        <span className="flex items-center gap-2">
                                          <span className="text-sm">{isSubjectCollapsed ? '▶' : '▼'}</span>
                                          <span>{subject} ({subjectLessons.length})</span>
                                        </span>
                                      </button>
                                      
                                      {/* Lessons */}
                                      {!isSubjectCollapsed && (
                                        <div className="ml-4 mt-2 space-y-2">
                                          {subjectLessons.map((lesson) => (
                                            <div 
                                              key={lesson.id} 
                                              className={`border rounded p-3 ${lesson.completed ? 'bg-green-50' : 'bg-white'}`}
                                            >
                                              {editingLessonId === lesson.id ? (
                                                // Edit Mode
                                                <div className="space-y-2">
                                                  <input
                                                    type="text"
                                                    value={editLessonTitle}
                                                    onChange={(e) => setEditLessonTitle(e.target.value)}
                                                    className="w-full px-2 py-1 border rounded text-gray-900 text-sm"
                                                    placeholder="Title"
                                                  />
                                                  <input
                                                    type="text"
                                                    value={editLessonSubject}
                                                    onChange={(e) => setEditLessonSubject(e.target.value)}
                                                    className="w-full px-2 py-1 border rounded text-gray-900 text-sm"
                                                    placeholder="Subject"
                                                  />
                                                  <textarea
                                                    value={editLessonDescription}
                                                    onChange={(e) => setEditLessonDescription(e.target.value)}
                                                    className="w-full px-2 py-1 border rounded text-gray-900 text-sm"
                                                    placeholder="Description"
                                                    rows={2}
                                                  />
                                                  <input
                                                    type="date"
                                                    value={editLessonDate}
                                                    onChange={(e) => setEditLessonDate(e.target.value)}
                                                    className="w-full px-2 py-1 border rounded text-gray-900 text-sm"
                                                  />
                                                  <select
                                                    value={editLessonDuration}
                                                    onChange={(e) => setEditLessonDuration(e.target.value)}
                                                    className="w-full px-2 py-1 border rounded text-gray-900 text-sm"
                                                  >
                                                    <option value="">Duration (optional)</option>
                                                    {DURATION_OPTIONS.map(duration => (
                                                      <option key={duration} value={duration}>{duration}</option>
                                                    ))}
                                                  </select>
                                                  <div className="flex gap-2">
                                                    <button
                                                      onClick={() => saveEditLesson(lesson.id)}
                                                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                                    >
                                                      Save
                                                    </button>
                                                    <button
                                                      onClick={cancelEditLesson}
                                                      className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                                    >
                                                      Cancel
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                                // View Mode
                                                <div className="flex items-start gap-3">
                                                  <input
                                                    type="checkbox"
                                                    checked={lesson.completed}
                                                    onChange={() => toggleComplete(lesson.id, lesson.completed)}
                                                    className="mt-1 w-4 h-4 cursor-pointer"
                                                  />
                                                  <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                      <div>
                                                        <h3 className={`font-semibold text-gray-900 text-sm ${lesson.completed ? 'line-through' : ''}`}>
                                                          {lesson.title}
                                                        </h3>
                                                        {lesson.duration && (
                                                          <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded mt-1">
                                                            ⏱️ {lesson.duration}
                                                          </span>
                                                        )}
                                                        {lesson.description && (
                                                          (() => {
                                                            try {
                                                              const lessonData = JSON.parse(lesson.description);
                                                              return (
                                                                <div className="mt-2 space-y-2 text-xs">
                                                                  {lessonData.approach && (
                                                                    <p className="text-gray-700 italic">{lessonData.approach}</p>
                                                                  )}
                                                                  {lessonData.materials && lessonData.materials.length > 0 && (
                                                                    <div>
                                                                      <p className="font-semibold text-gray-900">📚 Materials:</p>
                                                                      <ul className="list-disc list-inside text-gray-600 ml-2">
                                                                        {lessonData.materials.map((item: string, i: number) => (
                                                                          <li key={i}>{item}</li>
                                                                        ))}
                                                                      </ul>
                                                                    </div>
                                                                  )}
                                                                </div>
                                                              );
                                                            } catch (e) {
                                                              return <p className="text-gray-600 text-xs mt-1">{lesson.description}</p>;
                                                            }
                                                          })()
                                                        )}
                                                        {lesson.lesson_date && (
                                                          <p className="text-gray-500 text-xs mt-1">
                                                            📅 {new Date(lesson.lesson_date).toLocaleDateString()}
                                                          </p>
                                                        )}
                                                      </div>
                                                      <div className="flex gap-1">
                                                        <button
                                                          onClick={() => startEditLesson(lesson)}
                                                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                                        >
                                                          Edit
                                                        </button>
                                                        <button
                                                          onClick={() => deleteLesson(lesson.id)}
                                                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                                        >
                                                          Delete
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {showGenerator && (
                    <LessonGenerator 
                      children={kids} 
                      onClose={() => setShowGenerator(false)} 
                    />
                  )}
                  
                  {showImporter && selectedKidData && (
                    <CurriculumImporter
                      childId={selectedKidData.id}
                      childName={selectedKidData.name}
                      onClose={() => setShowImporter(false)}
                      onImportComplete={() => {
                        setShowImporter(false);
                        loadLessons(selectedKid!);
                      }}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">Add a child to start tracking lessons!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}