// app/planning/page.tsx
import PlanningModeDashboard from '@/components/PlanningModeDashboard';
import AuthGuard from '@/components/AuthGuard';

export default function PlanningPage() {
  return (
    <AuthGuard>
      <PlanningModeDashboard />
    </AuthGuard>
  );
}

export const metadata = {
  title: 'Planning Mode | HomeschoolHQ',
  description: 'Organize and plan your homeschool schedule',
};