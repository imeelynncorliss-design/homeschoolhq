import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/src/lib/supabase/server'
import { sendInviteEmail } from '@/src/lib/resend'
import { generateCode } from '@/src/lib/invites'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // 1. Verify the requester is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get request body
  const { email, role = 'co_teacher', permissions } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // 3. Verify the requester is an owner or admin of their org
  const { data: membership, error: membershipError } = await supabase
    .from('user_organizations')
    .select('role, organization_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError || !membership) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  if (membership.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can send invites' }, { status: 403 })
  }

  const organizationId = membership.organization_id

  // 4. Check if this email already has a pending invite for this org
  const { data: existingInvite } = await supabase
    .from('collaborator_invites')
    .select('id, status')
    .eq('email', email)
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingInvite) {
    return NextResponse.json(
      { error: 'A pending invite already exists for this email' },
      { status: 409 }
    )
  }

  // 5. Check if this person is already a collaborator
  const { data: existingCollaborator } = await supabase
    .from('family_collaborators')
    .select('id')
    .eq('email', email)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (existingCollaborator) {
    return NextResponse.json(
      { error: 'This person is already a collaborator on your account' },
      { status: 409 }
    )
  }

  // 6. Get inviter's profile for the email
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('parent_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const inviterName = profile?.parent_name || user.email || 'Your homeschool admin'

  // 7. Get organization name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .maybeSingle()

  const organizationName = org?.name || 'HomeschoolReady'

  // 8. Create the invite record
  const { data: invite, error: inviteError } = await supabase
    .from('collaborator_invites')
    .insert({
      email,
      role,
      permissions: permissions || null,
      status: 'pending',
      created_by: user.id,
      organization_id: organizationId,
      code: generateCode(),     
      invited_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
    })
    .select('code')
    .single()

  if (inviteError || !invite) {
    console.error('Invite creation error:', inviteError)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }

  // 9. Send the email
  try {
    await sendInviteEmail({
      to: email,
      inviterName,
      organizationName,
      inviteCode: invite.code,
      role,
    })
  } catch (emailError) {
    // Invite was created but email failed — delete the invite so they can retry
    await supabase.from('collaborator_invites').delete().eq('code', invite.code)
    console.error('Email send error:', emailError)
    return NextResponse.json({ error: 'Failed to send invite email' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Invitation sent to ${email}`,
  })
}