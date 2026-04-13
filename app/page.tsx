import { redirect } from 'next/navigation'

export default async function Home(props: { searchParams: Promise<{ invite?: string }> }) {
  const searchParams = await props.searchParams
  const invite = searchParams?.invite
  redirect(invite ? `/login?invite=${encodeURIComponent(invite)}` : '/login')
}