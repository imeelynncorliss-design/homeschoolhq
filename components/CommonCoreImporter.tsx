'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: string
  state_code: string
  grade_level: string
  subject: string
  standard_code: string
  description: string
  domain: string | null
}

interface CommonCoreImporterProps {
  organizationId: string
  onImported?: (count: number) => void
}

// ─── Grade levels in order ────────────────────────────────────────────────────

const GRADE_ORDER = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9-10', '11-12', 'HS']

const gradeLabel = (g: string) => {
  if (g === 'K') return 'Kindergarten'
  if (g === '9-10') return 'Grades 9-10'
  if (g === '11-12') return 'Grades 11-12'
  if (g === 'HS') return 'High School Math'
  const suffix = g === '1' ? 'st' : g === '2' ? 'nd' : g === '3' ? 'rd' : 'th'
  return `${g}${suffix} Grade`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommonCoreImporter({ organizationId, onImported }: CommonCoreImporterProps) {
  const [templates, setTemplates]             = useState<Template[]>([])
  const [alreadyImported, setAlreadyImported] = useState<Set<string>>(new Set())
  const [selectedGrades, setSelectedGrades]   = useState<Set<string>>(new Set())
  const [loading, setLoading]                 = useState(true)
  const [importing, setImporting]             = useState(false)
  const [importedCount, setImportedCount]     = useState<number | null>(null)
  const [error, setError]                     = useState<string | null>(null)

  useEffect(() => { load() }, [organizationId])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/standards/templates?state_code=CCSS')
      const json = await res.json()
      const tmpl = json.success ? json.data.templates : []

      const { data: existing } = await supabase
        .from('user_standards')
        .select('template_id')
        .eq('organization_id', organizationId)
        .not('template_id', 'is', null)

      setTemplates(tmpl || [])
      setAlreadyImported(new Set((existing || []).map((e: any) => e.template_id)))
    } catch (err) {
      console.error('[CommonCoreImporter] load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const availableGrades = GRADE_ORDER.filter(g => templates.some(t => t.grade_level === g))

  const subjectsByGrade = (grade: string) => {
    const subjects = [...new Set(templates.filter(t => t.grade_level === grade).map(t => t.subject))].sort()
    return subjects
  }

  const countForGrades = (grades: Set<string>) => {
    return templates.filter(t => grades.has(t.grade_level) && !alreadyImported.has(t.id)).length
  }

  const alreadyImportedForGrades = (grades: Set<string>) => {
    return templates.filter(t => grades.has(t.grade_level) && alreadyImported.has(t.id)).length
  }

  const toggleGrade = (grade: string) => {
    setSelectedGrades(prev => {
      const next = new Set(prev)
      if (next.has(grade)) next.delete(grade)
      else next.add(grade)
      return next
    })
    setImportedCount(null)
    setError(null)
  }

  const handleImport = async () => {
    if (selectedGrades.size === 0) return
    setImporting(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const templateIds = templates
        .filter(t => selectedGrades.has(t.grade_level) && !alreadyImported.has(t.id))
        .map(t => t.id)

      if (templateIds.length === 0) {
        setError('All standards for the selected grades are already imported.')
        setImporting(false)
        return
      }

      const res = await fetch('/api/standards/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ template_ids: templateIds }),
      })
      const json = await res.json()

      if (!json.success) {
        setError(json.error?.message || 'Import failed. Please try again.')
      } else {
        setImportedCount(json.data.imported)
        // Mark newly imported templates as already imported
        setAlreadyImported(prev => {
          const next = new Set(prev)
          templateIds.forEach(id => next.add(id))
          return next
        })
        onImported?.(json.data.imported)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
      Loading…
    </div>
  )

  const newCount = countForGrades(selectedGrades)
  const alreadyCount = alreadyImportedForGrades(selectedGrades)

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>

      {/* What is Common Core */}
      <div style={{
        background: '#f5f3ff', borderRadius: 14, padding: '14px 18px', marginBottom: 24,
        border: '1.5px solid #ede9fe',
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#7c3aed', marginBottom: 6 }}>📌 What is Common Core?</div>
        <p style={{ fontSize: 13, color: '#374151', fontWeight: 600, margin: 0, lineHeight: 1.7 }}>
          Common Core is a set of national academic standards for <strong>Math</strong> and <strong>English Language Arts (ELA)</strong>,
          used as a benchmark across the US. Once imported, you can tag these standards to your lessons
          so you always know what's been covered — and what still needs attention.
        </p>
      </div>

      {/* Grade picker */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#4b5563', letterSpacing: 0.4, marginBottom: 12, textTransform: 'uppercase' as const }}>
          Select grade levels to import
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 10 }}>
          {availableGrades.map(grade => {
            const isSelected = selectedGrades.has(grade)
            const fullyImported = templates
              .filter(t => t.grade_level === grade)
              .every(t => alreadyImported.has(t.id))

            return (
              <button
                key={grade}
                onClick={() => !fullyImported && toggleGrade(grade)}
                style={{
                  padding: '10px 18px', borderRadius: 12,
                  fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 14,
                  cursor: fullyImported ? 'default' : 'pointer', transition: 'all 0.15s',
                  border: `2px solid ${isSelected ? '#7c3aed' : fullyImported ? '#d1fae5' : '#e5e7eb'}`,
                  background: isSelected ? '#ede9fe' : fullyImported ? '#f0fdf4' : '#fff',
                  color: isSelected ? '#7c3aed' : fullyImported ? '#16a34a' : '#6b7280',
                  position: 'relative' as const,
                }}
              >
                {grade === 'K' ? 'K' : grade}
                {fullyImported && (
                  <span style={{ fontSize: 10, marginLeft: 4 }}>✓</span>
                )}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, marginTop: 8 }}>
          ✓ = already imported
        </div>
      </div>

      {/* Preview of what will be imported */}
      {selectedGrades.size > 0 && (
        <div style={{
          background: '#f9fafb', borderRadius: 14, padding: '16px 18px',
          border: '1.5px solid #e5e7eb', marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 10 }}>
            What you're importing
          </div>
          {Array.from(selectedGrades).sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b)).map(grade => {
            const subjects = subjectsByGrade(grade)
            const count = templates.filter(t => t.grade_level === grade && !alreadyImported.has(t.id)).length
            const existing = templates.filter(t => t.grade_level === grade && alreadyImported.has(t.id)).length
            return (
              <div key={grade} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 13 }}>
                <div>
                  <span style={{ fontWeight: 800, color: '#1e1b4b' }}>{gradeLabel(grade)}</span>
                  <span style={{ color: '#9ca3af', marginLeft: 8, fontWeight: 600 }}>{subjects.join(' · ')}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {count > 0 && (
                    <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 800 }}>
                      +{count} new
                    </span>
                  )}
                  {existing > 0 && (
                    <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                      {existing} ✓
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          {newCount === 0 && alreadyCount > 0 && (
            <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 700, marginTop: 8 }}>
              ✓ All standards for the selected grades are already in your library.
            </div>
          )}
        </div>
      )}

      {/* Success */}
      {importedCount !== null && (
        <div style={{
          background: '#f0fdf4', borderRadius: 14, padding: '14px 18px',
          border: '1.5px solid #bbf7d0', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 24 }}>🎉</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}>
              {importedCount} standard{importedCount !== 1 ? 's' : ''} imported!
            </div>
            <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>
              Head to <strong>Records → Standards</strong> to see your coverage.
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2', borderRadius: 14, padding: '12px 16px',
          border: '1.5px solid #fecaca', marginBottom: 20,
          fontSize: 13, color: '#dc2626', fontWeight: 700,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Import button */}
      <button
        onClick={handleImport}
        disabled={importing || selectedGrades.size === 0 || newCount === 0}
        style={{
          width: '100%', padding: '14px 20px',
          background: importing || selectedGrades.size === 0 || newCount === 0
            ? '#e5e7eb'
            : 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: importing || selectedGrades.size === 0 || newCount === 0 ? '#9ca3af' : '#fff',
          border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800,
          cursor: importing || selectedGrades.size === 0 || newCount === 0 ? 'not-allowed' : 'pointer',
          fontFamily: "'Nunito', sans-serif", transition: 'all 0.15s',
        }}
      >
        {importing
          ? '⏳ Importing…'
          : selectedGrades.size === 0
          ? 'Select grade levels above to continue'
          : newCount === 0
          ? '✓ Already imported'
          : `📥 Import ${newCount} Common Core Standards`}
      </button>

      {/* Disclaimer */}
      <p style={{
        fontSize: 11, color: '#9ca3af', fontWeight: 600,
        lineHeight: 1.6, marginTop: 16, textAlign: 'center' as const,
      }}>
        HomeschoolHQ provides Common Core State Standards (CCSS) as a convenience reference.
        Standards may be updated or revised over time — it is the parent's responsibility to
        verify that the standards used are current and appropriate for their jurisdiction.
        HomeschoolHQ makes no guarantee of accuracy or completeness.
      </p>
    </div>
  )
}
