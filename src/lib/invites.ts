/**
 * invites.ts
 * Core utility for co-teacher invite flow.
 * Uses: collaborator_invites (invite lifecycle) + family_collaborators (accepted members)
 * Place at: src/lib/invites.ts
 */

import { createClient } from '@/src/lib/supabase';

// Omits 0/O/1/I to avoid confusion when reading codes aloud or by eye
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCode(length = 8): string {
  return Array.from(
    { length },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('');
}

// ─────────────────────────────────────────
// CREATE INVITE
// ─────────────────────────────────────────

export type InviteRole = 'co_teacher' | 'aide';

export interface CreateInviteParams {
  organizationId: string;
  createdBy: string;         // admin user id
  email?: string;            // optional: restricts code to one email address
  role: InviteRole;
}

export async function createInvite({
  organizationId,
  createdBy,
  email,
  role,
}: CreateInviteParams) {
  const supabase = createClient();

  // Retry up to 3 times to handle rare code collisions
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode();

    const { data, error } = await supabase
      .from('collaborator_invites')
      .insert({
        organization_id: organizationId,
        created_by: createdBy,
        email: email ?? '',       // email is NOT NULL in schema; empty string = open invite
        code,
        role,
        status: 'pending',
      })
      .select()
      .single();

    if (!error) return { data, error: null };

    // 23505 = unique constraint violation (duplicate code) — retry
    if (error.code !== '23505') return { data: null, error };
  }

  return { data: null, error: new Error('Failed to generate a unique invite code after 3 attempts.') };
}

// ─────────────────────────────────────────
// REDEEM INVITE
// ─────────────────────────────────────────

export interface RedeemInviteResult {
  success: boolean;
  error?: string;
  organizationId?: string;
  role?: InviteRole;
}

export async function redeemInvite(
  code: string,
  userId: string,
  userEmail: string
): Promise<RedeemInviteResult> {
  const supabase = createClient();

  // 1. Look up the invite
  const { data: invite, error: fetchError } = await supabase
    .from('collaborator_invites')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (fetchError || !invite) {
    return { success: false, error: 'Invalid or expired invite code. Please check the code and try again.' };
  }

  // 2. Email-bound check — only applies when email was specified at creation
  if (invite.email && invite.email !== '' && invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    return { success: false, error: 'This invite code was created for a different email address.' };
  }

  // 3. Check user isn't already a member of this org
  const { data: existing } = await supabase
    .from('family_collaborators')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', invite.organization_id)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'You are already a member of this family account.' };
  }

  // 4. Add to family_collaborators
  // Note: owner_id is NOT NULL legacy column — using created_by as a stand-in
  // until owner_id is deprecated post-launch
  const { error: memberError } = await supabase
    .from('family_collaborators')
    .insert({
      organization_id: invite.organization_id,
      owner_id: invite.created_by,   // legacy NOT NULL field
      user_id: userId,
      email: userEmail,
      name: userEmail,               // placeholder; profile setup can update this
      role: invite.role,
      permissions: defaultPermissionsForRole(invite.role),
    });

  if (memberError) {
    return { success: false, error: 'Failed to join the family account. Please try again.' };
  }

  // 5. Mark invite as accepted
  const { error: updateError } = await supabase
    .from('collaborator_invites')
    .update({
      status: 'accepted',
      user_id: userId,               // records who redeemed it
      updated_at: new Date().toISOString(),
    })
    .eq('id', invite.id);

  if (updateError) {
    // Non-fatal: member was added successfully; invite status update failing is acceptable
    console.error('Failed to mark invite as accepted:', updateError);
  }

  return {
    success: true,
    organizationId: invite.organization_id,
    role: invite.role,
  };
}

// ─────────────────────────────────────────
// REVOKE INVITE
// ─────────────────────────────────────────

export async function revokeInvite(inviteId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('collaborator_invites')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('status', 'pending');   // only revoke if still pending

  return { error };
}

// ─────────────────────────────────────────
// GET INVITES FOR ORG (admin view)
// ─────────────────────────────────────────

export async function getOrgInvites(organizationId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('collaborator_invites')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  return { data, error };
}

// ─────────────────────────────────────────
// GET COLLABORATORS FOR ORG (admin view)
// ─────────────────────────────────────────

export async function getOrgCollaborators(organizationId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('family_collaborators')
    .select('*')
    .eq('organization_id', organizationId)
    .order('added_at', { ascending: false });

  return { data, error };
}

// ─────────────────────────────────────────
// REMOVE COLLABORATOR
// ─────────────────────────────────────────

export async function removeCollaborator(collaboratorId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('family_collaborators')
    .delete()
    .eq('id', collaboratorId);

  return { error };
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function defaultPermissionsForRole(role: InviteRole) {
  // Matches the JSONB structure already defined in family_collaborators
  switch (role) {
    case 'co_teacher':
      return {
        can_edit_lessons: true,
        can_view_progress: true,
        can_manage_kids: false,
        can_create_events: true,
      };
    case 'aide':
      return {
        can_edit_lessons: false,
        can_view_progress: true,
        can_manage_kids: false,
        can_create_events: false,
      };
  }
}