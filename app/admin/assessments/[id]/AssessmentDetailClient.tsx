'use client';

import React, { useState } from 'react';
import { Calendar, Clock, BookOpen, Target, Edit, UserPlus, Trash2, Copy, Printer, Download, TrendingUp, CheckCircle, XCircle, Clock as ClockIcon, Award, BarChart3, AlertCircle } from 'lucide-react';

type Standard = {
  id: string;
  standard_id: string;
  standard: {
    id: string;
    framework: string;
    code: string;
    description: string;
    subject: string;
    grade_level: string;
    domain: string;
  };
};

type Assessment = {
  id: string;
  title: string;
  description: string;
  subject: string;
  type: string;
  grade_level: number;
  question_count: number;
  created_at: string;
  status: string;
};

type StudentProgress = {
  id: string;
  name: string;
  avatar: string;
  status: 'completed' | 'in_progress' | 'not_started';
  score: number | null;
  maxScore: number;
  completedAt: string | null;
  timeSpent: number;
  questionsCorrect: number;
  totalQuestions: number;
  standardsMastery: Record<string, any>;
};

type AssignmentHistory = {
  id: string;
  assignedDate: string;
  dueDate: string;
  studentsAssigned: string[];
  completed: number;
  inProgress: number;
  notStarted: number;
  averageScore: number;
};

interface AssessmentDetailClientProps {
  assessment: Assessment;
  standards: Standard[];
  studentProgress: StudentProgress[];
  assignmentHistory: AssignmentHistory[];
}

export default function AssessmentDetailClient({ 
  assessment, 
  standards, 
  studentProgress,
  assignmentHistory 
}: AssessmentDetailClientProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate grade distribution
  const getGradeDistribution = () => {
    const completed = studentProgress.filter(s => s.status === 'completed' && s.score !== null);
    const distribution: Record<string, number> = {
      'A (90-100)': 0,
      'B (80-89)': 0,
      'C (70-79)': 0,
      'D (60-69)': 0,
      'F (0-59)': 0
    };

    completed.forEach(student => {
      if (student.score! >= 90) distribution['A (90-100)']++;
      else if (student.score! >= 80) distribution['B (80-89)']++;
      else if (student.score! >= 70) distribution['C (70-79)']++;
      else if (student.score! >= 60) distribution['D (60-69)']++;
      else distribution['F (0-59)']++;
    });

    return distribution;
  };

  const gradeDistribution = getGradeDistribution();
  const maxCount = Math.max(...Object.values(gradeDistribution), 1); // Prevent division by zero

  const getFrameworkBadgeColor = (framework: string) => {
    const colors: Record<string, string> = {
      'Common Core': 'bg-blue-500',
      'NGSS': 'bg-purple-500',
      'State Standards': 'bg-teal-500',
      'Custom': 'bg-indigo-500'
    };
    return colors[framework] || 'bg-gray-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Completed
        </span>;
      case 'in_progress':
        return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <ClockIcon className="w-3 h-3" /> In Progress
        </span>;
      case 'not_started':
        return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Not Started
        </span>;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMasteryIcon = (mastered: boolean) => {
    if (mastered) return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <XCircle className="w-4 h-4 text-gray-400" />;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    alert('Exporting to PDF...');
  };

  // Calculate average score for completed assessments
  const completedAssessments = studentProgress.filter(s => s.status === 'completed' && s.score !== null);
  const averageScore = completedAssessments.length > 0
    ? Math.round(completedAssessments.reduce((acc, s) => acc + s.score!, 0) / completedAssessments.length)
    : 0;

  // Calculate completion rate
  const completionRate = studentProgress.length > 0
    ? Math.round((completedAssessments.length / studentProgress.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-purple-200 text-sm font-medium">
                  {assessment.subject}
                </span>
                <span className="text-purple-200">•</span>
                <span className="text-purple-200 text-sm">Grade {assessment.grade_level}</span>
              </div>
              
              <h1 className="text-4xl font-bold mb-3">
                {assessment.title}
              </h1>
              
              <p className="text-purple-100 text-lg mb-6">
                {assessment.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{assessment.question_count} questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>{standards.length} standards aligned</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Created {new Date(assessment.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 ml-6">
              <button onClick={handlePrint} className="bg-white text-purple-600 px-4 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors shadow-md flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button onClick={handleExportPDF} className="bg-white text-purple-600 px-4 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors shadow-md flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="bg-white text-purple-600 px-4 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors shadow-md flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button className="bg-purple-800 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-900 transition-colors shadow-md flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Assign
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Overview
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'progress'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Student Progress ({studentProgress.filter(s => s.status !== 'not_started').length}/{studentProgress.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📅 Assignment History ({assignmentHistory.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Overview Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">🎯</span>
                  <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Type</div>
                    <div className="text-lg font-semibold text-gray-900">{assessment.type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Status</div>
                    <div className="text-lg font-semibold text-gray-900">
                      <span className="text-green-600">Active</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Questions</div>
                    <div className="text-lg font-semibold text-gray-900">{assessment.question_count}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Standards</div>
                    <div className="text-lg font-semibold text-gray-900">{standards.length}</div>
                  </div>
                </div>
              </div>

              {/* Standards Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">📚</span>
                  <h2 className="text-2xl font-bold text-gray-900">Educational Standards</h2>
                  <span className="ml-auto bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    {standards.length} aligned
                  </span>
                </div>
                
                {standards.length > 0 ? (
                  <div className="space-y-4">
                    {standards.map((item) => (
                      <div 
                        key={item.id}
                        className="border-2 rounded-lg p-4 hover:border-purple-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`${getFrameworkBadgeColor(item.standard.framework)} text-white px-3 py-1 rounded-md text-sm font-medium`}>
                              {item.standard.framework}
                            </span>
                            <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono text-gray-800">
                              {item.standard.code}
                            </code>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-2">
                          {item.standard.description}
                        </p>
                        
                        {item.standard.domain && (
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mt-3">
                            <p className="text-sm text-blue-800">
                              <span className="font-semibold">Domain: </span>
                              {item.standard.domain}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 mb-4">No standards aligned yet</p>
                    <button className="text-purple-600 hover:text-purple-700 font-medium">
                      + Add Standards
                    </button>
                  </div>
                )}
                
                <button className="mt-4 w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors font-medium">
                  + Add More Standards
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                
                <div className="space-y-3">
                  <button className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Assign to Students
                  </button>
                  
                  <button className="w-full bg-white text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors border-2 border-gray-200 flex items-center justify-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Assessment
                  </button>
                  
                  <button className="w-full bg-white text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors border-2 border-gray-200 flex items-center justify-center gap-2">
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  
                  <button className="w-full bg-white text-red-600 px-4 py-3 rounded-lg font-medium hover:bg-red-50 transition-colors border-2 border-red-200 flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Assessment Stats */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Statistics</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Average Score</span>
                      <span className="text-lg font-bold text-gray-900">{averageScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${averageScore}%` }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Completion Rate</span>
                      <span className="text-lg font-bold text-gray-900">{completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${completionRate}%` }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Times Assigned</span>
                      <span className="text-lg font-bold text-gray-900">{assignmentHistory.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Student Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* Progress Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Completed</span>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{studentProgress.filter(s => s.status === 'completed').length}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {studentProgress.length > 0 ? Math.round((studentProgress.filter(s => s.status === 'completed').length / studentProgress.length) * 100) : 0}% of students
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">In Progress</span>
                  <ClockIcon className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{studentProgress.filter(s => s.status === 'in_progress').length}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {studentProgress.length > 0 ? Math.round((studentProgress.filter(s => s.status === 'in_progress').length / studentProgress.length) * 100) : 0}% of students
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Not Started</span>
                  <XCircle className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{studentProgress.filter(s => s.status === 'not_started').length}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {studentProgress.length > 0 ? Math.round((studentProgress.filter(s => s.status === 'not_started').length / studentProgress.length) * 100) : 0}% of students
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Avg Score</span>
                  <Award className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {averageScore}%
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Of completed assessments
                </div>
              </div>
            </div>

            {/* Student List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">👥</span>
                  <h2 className="text-2xl font-bold text-gray-900">Student Performance</h2>
                </div>
              </div>

              {studentProgress.length > 0 ? (
                <div className="space-y-4">
                  {studentProgress.map((student) => (
                    <div key={student.id} className="border-2 rounded-lg p-6 hover:border-purple-300 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="text-4xl">{student.avatar}</div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                            {getStatusBadge(student.status)}
                          </div>
                        </div>
                        {student.score !== null && (
                          <div className="text-right">
                            <div className={`text-3xl font-bold ${getScoreColor(student.score)}`}>
                              {student.score}%
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.questionsCorrect}/{student.totalQuestions} correct
                            </div>
                          </div>
                        )}
                      </div>

                      {student.completedAt && (
                        <div className="text-sm text-gray-600">
                          Completed {student.completedAt}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-2">No students have been assigned this assessment yet</p>
                  <button className="text-purple-600 hover:text-purple-700 font-medium">
                    Assign to Students
                  </button>
                </div>
              )}
            </div>

            {/* Grade Distribution Chart */}
            {completedAssessments.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">📊</span>
                    <h2 className="text-2xl font-bold text-gray-900">Grade Distribution</h2>
                  </div>
                  <div className="text-sm text-gray-500">
                    Based on {completedAssessments.length} completed assessments
                  </div>
                </div>

                <div className="space-y-4">
                  {Object.entries(gradeDistribution).map(([grade, count]) => {
                    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    const gradeColor = 
                      grade.startsWith('A') ? 'bg-green-500' :
                      grade.startsWith('B') ? 'bg-blue-500' :
                      grade.startsWith('C') ? 'bg-yellow-500' :
                      grade.startsWith('D') ? 'bg-orange-500' :
                      'bg-red-500';
                    
                    return (
                      <div key={grade} className="flex items-center gap-4">
                        <div className="w-24 text-sm font-medium text-gray-700">{grade}</div>
                        <div className="flex-1">
                          <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                            <div 
                              className={`${gradeColor} h-full transition-all duration-500 flex items-center justify-end pr-3`}
                              style={{ width: `${percentage}%` }}
                            >
                              {count > 0 && (
                                <span className="text-white font-semibold text-sm">
                                  {count} {count === 1 ? 'student' : 'students'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="w-16 text-right text-sm font-semibold text-gray-900">
                          {completedAssessments.length > 0 
                            ? Math.round((count / completedAssessments.length) * 100)
                            : 0}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Standards Mastery Tracking */}
            {standards.length > 0 && completedAssessments.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🎓</span>
                    <h2 className="text-2xl font-bold text-gray-900">Standards Mastery by Student</h2>
                  </div>
                  <button className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export Standards Report
                  </button>
                </div>

                {/* Standards Legend */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-3">Standards Assessed:</div>
                  <div className="space-y-2">
                    {standards.map((standard) => (
                      <div key={standard.id} className="flex items-start gap-3">
                        <span className={`${getFrameworkBadgeColor(standard.standard.framework)} text-white px-2 py-1 rounded text-xs font-medium`}>
                          {standard.standard.code}
                        </span>
                        <p className="text-sm text-gray-700 flex-1">{standard.standard.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {completedAssessments.map((student) => (
                    <div key={student.id} className="border-2 rounded-lg p-4 hover:border-purple-300 transition-colors">
                      <h4 className="font-semibold text-gray-900 mb-3">{student.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(student.standardsMastery).map(([standardId, mastery]) => {
                          const standard = standards.find(s => s.standard_id === standardId);
                          if (!standard) return null;
                          
                          return (
                            <div key={standardId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                {getMasteryIcon(mastery.mastered)}
                                <span className="text-sm font-medium text-gray-700">
                                  {standard.standard.code}
                                </span>
                              </div>
                              <span className={`text-sm font-semibold ${getScoreColor(mastery.score)}`}>
                                {mastery.score}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assignment History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">📅</span>
                <h2 className="text-2xl font-bold text-gray-900">Assignment History</h2>
              </div>

              {assignmentHistory.length > 0 ? (
                <div className="space-y-4">
                  {assignmentHistory.map((assignment, index) => (
                    <div key={assignment.id} className="border-2 rounded-lg p-6 hover:border-purple-300 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Assignment #{assignmentHistory.length - index}
                            </h3>
                            {index === 0 && (
                              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Assigned: {assignment.assignedDate}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              <span>Due: {assignment.dueDate}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-600">{assignment.averageScore}%</div>
                          <div className="text-sm text-gray-500">Avg Score</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600 mb-1">Total Students</div>
                          <div className="text-xl font-bold text-gray-900">{assignment.studentsAssigned.length}</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600 mb-1">Completed</div>
                          <div className="text-xl font-bold text-green-600">{assignment.completed}</div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600 mb-1">In Progress</div>
                          <div className="text-xl font-bold text-yellow-600">{assignment.inProgress}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600 mb-1">Not Started</div>
                          <div className="text-xl font-bold text-gray-600">{assignment.notStarted}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-600 mb-2">Students Assigned:</div>
                        <div className="flex flex-wrap gap-2">
                          {assignment.studentsAssigned.map((student, idx) => (
                            <span key={idx} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                              {student}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-2">No assignment history yet</p>
                  <p className="text-sm">Assign this assessment to students to track history</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}