'use client'

/**
 * Shared empty state for any page in roadmap item 1.3 whose UI depends on
 * at least one kids row existing (attendance, lessons, progress, etc).
 * Without the old onboarding gate, a brand-new org can reach these pages
 * with zero students — this replaces student-dependent UI (which would
 * otherwise render misleadingly, e.g. "0 of 180 required") with a single
 * clear action instead.
 */

import Link from 'next/link'
import { colors } from '@/src/lib/designTokens'

export function NoStudentsEmptyState({ message }: { message?: string }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🧑‍🎓</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, marginBottom: 8 }}>
        No students yet
      </div>
      <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
        {message ?? "Add your first student to get started."}
      </div>
      <Link
        href="/profile?addKid=1"
        style={{ display: 'inline-block', background: colors.purple, color: colors.white, fontWeight: 700, padding: '10px 20px', borderRadius: 10, textDecoration: 'none' }}
      >
        Add your first student
      </Link>
    </div>
  )
}
