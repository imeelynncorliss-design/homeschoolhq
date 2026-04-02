import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = [
  'imeelynn.corliss@gmail.com',
  'courtneyditrich@gmail.com',
  'corlissimo@gmail.com',
  'bcunningham1117@gmail.com',
]

export async function GET() {
  // Verify caller is an admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Use service role to access auth.users
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: { users: authUsers }, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = authUsers.map(u => u.id)

  const [profilesRes, subsRes] = await Promise.all([
    admin.from('user_profiles').select('user_id, first_name, created_at').in('user_id', userIds),
    admin.from('user_subscriptions').select('user_id, tier').in('user_id', userIds),
  ])

  const profileMap: Record<string, any> = {}
  for (const p of profilesRes.data ?? []) profileMap[p.user_id] = p

  const tierMap: Record<string, string> = {}
  for (const s of subsRes.data ?? []) tierMap[s.user_id] = s.tier

  const merged = authUsers.map(u => ({
    user_id:    u.id,
    email:      u.email ?? '',
    first_name: profileMap[u.id]?.first_name ?? '',
    tier:       tierMap[u.id] ?? 'FREE',
    created_at: profileMap[u.id]?.created_at ?? u.created_at,
  })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ users: merged })
}

// PUT: find user by email and set their tier
export async function PUT(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { email, tier } = await req.json()
  if (!email || !tier) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: authUser, error: lookupError } = await admin.auth.admin.getUserByEmail(email.trim().toLowerCase())
  if (lookupError || !authUser?.user) {
    return NextResponse.json({ error: 'No account found for that email. They may not have signed up yet.' }, { status: 404 })
  }

  const user_id = authUser.user.id

  const { error: subError } = await admin
    .from('user_subscriptions')
    .upsert({ user_id, tier, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })

  await admin.from('user_profiles').update({ subscription_tier: tier }).eq('user_id', user_id)

  return NextResponse.json({
    success: true,
    user: { user_id, email: authUser.user.email, tier },
  })
}

export async function POST(req: Request) {
  // Verify caller is an admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { user_id, tier } = await req.json()
  if (!user_id || !tier) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error: subError } = await admin
    .from('user_subscriptions')
    .upsert({ user_id, tier, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })

  await admin.from('user_profiles').update({ subscription_tier: tier }).eq('user_id', user_id)

  return NextResponse.json({ success: true })
}
