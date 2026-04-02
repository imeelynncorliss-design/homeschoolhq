import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = [
  'imeelynn.corliss@gmail.com',
  'courtneyditrich@gmail.com',
  'corlissimo@gmail.com',
  'bcunningham1117@gmail.com',
]

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function verifyAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // Hardcoded bootstrap list OR database flag
  if (ADMIN_EMAILS.includes(user.email ?? '')) return user
  const admin = adminClient()
  const { data } = await admin
    .from('user_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()
  if (data?.is_admin) return user
  return null
}

export async function GET() {
  const caller = await verifyAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const admin = adminClient()

  const { data: { users: authUsers }, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = authUsers.map(u => u.id)

  const [profilesRes, subsRes, agreementsRes] = await Promise.all([
    admin.from('user_profiles').select('user_id, first_name, created_at, is_admin').in('user_id', userIds),
    admin.from('user_subscriptions').select('user_id, tier').in('user_id', userIds),
    admin.from('user_agreements').select('user_id, age_confirmed, tos_confirmed, beta_nda_confirmed, agreed_at').in('user_id', userIds),
  ])

  const profileMap: Record<string, any> = {}
  for (const p of profilesRes.data ?? []) profileMap[p.user_id] = p

  const tierMap: Record<string, string> = {}
  for (const s of subsRes.data ?? []) tierMap[s.user_id] = s.tier

  const agreementMap: Record<string, any> = {}
  for (const a of agreementsRes.data ?? []) agreementMap[a.user_id] = a

  const merged = authUsers.map(u => ({
    user_id:            u.id,
    email:              u.email ?? '',
    first_name:         profileMap[u.id]?.first_name ?? '',
    tier:               tierMap[u.id] ?? 'FREE',
    created_at:         profileMap[u.id]?.created_at ?? u.created_at,
    last_sign_in_at:    u.last_sign_in_at ?? null,
    age_confirmed:      agreementMap[u.id]?.age_confirmed ?? false,
    tos_confirmed:      agreementMap[u.id]?.tos_confirmed ?? false,
    beta_nda_confirmed: agreementMap[u.id]?.beta_nda_confirmed ?? false,
    agreed_at:          agreementMap[u.id]?.agreed_at ?? null,
    is_banned:          !!(u.banned_until && new Date(u.banned_until) > new Date()),
    is_admin:           !!(profileMap[u.id]?.is_admin) || ADMIN_EMAILS.includes(u.email ?? ''),
  })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ users: merged })
}

// PATCH: deactivate (ban) or reactivate a user
export async function PATCH(req: Request) {
  const caller = await verifyAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { user_id, action } = await req.json() // action: 'deactivate' | 'reactivate' | 'grant_admin' | 'revoke_admin'
  if (!user_id || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  if (user_id === caller.id && action !== 'grant_admin') {
    return NextResponse.json({ error: 'You cannot perform this action on your own account.' }, { status: 400 })
  }

  const admin = adminClient()

  if (action === 'grant_admin' || action === 'revoke_admin') {
    const { error } = await admin
      .from('user_profiles')
      .update({ is_admin: action === 'grant_admin' })
      .eq('user_id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, is_admin: action === 'grant_admin' })
  }

  const ban_duration = action === 'deactivate' ? '876000h' : 'none'
  const { error } = await admin.auth.admin.updateUserById(user_id, { ban_duration })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, is_banned: action === 'deactivate' })
}

// DELETE: permanently delete a user and all their data
export async function DELETE(req: Request) {
  const caller = await verifyAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  if (user_id === caller.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
  }

  const admin = adminClient()
  const { error } = await admin.auth.admin.deleteUser(user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// PUT: find user by email and set their tier
export async function PUT(req: Request) {
  const caller = await verifyAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { email, tier } = await req.json()
  if (!email || !tier) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = adminClient()

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

// POST: update tier for a known user_id
export async function POST(req: Request) {
  const caller = await verifyAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { user_id, tier } = await req.json()
  if (!user_id || !tier) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = adminClient()

  const { error: subError } = await admin
    .from('user_subscriptions')
    .upsert({ user_id, tier, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })

  await admin.from('user_profiles').update({ subscription_tier: tier }).eq('user_id', user_id)

  return NextResponse.json({ success: true })
}
