import { redirect } from 'next/navigation'

// Roadmap item 1.2: the forced onboarding wizard is replaced by the
// in-dashboard setup checklist (item 1.4). This route is kept only so old
// links/bookmarks still resolve somewhere instead of 404ing. The pre-1.2
// wizard is recoverable from git history at commit
// ca3c043e21416ce0e1f2c75be5841c9e7cef2c42.
export default function OnboardingPage() {
  redirect('/dashboard')
}
