import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'noreply@homeschoolready.app'
const FROM_NAME = 'HomeschoolReady'

export interface SendInviteEmailParams {
  to: string
  inviterName: string
  organizationName: string
  inviteCode: string
  role: 'co_teacher' | 'admin' | 'aide'
}

export async function sendInviteEmail({
  to,
  inviterName,
  organizationName,
  inviteCode,
  role,
}: SendInviteEmailParams) {
  const roleLabel =
    role === 'admin' ? 'Co-Admin' :
    role === 'aide' ? 'Teaching Aide' :
    'Co-Teacher'

  const acceptUrl = `https://homeschoolready.app/signup?code=${inviteCode}`

  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject: `${inviterName} invited you to join ${organizationName} on HomeschoolReady`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">You're invited!</h1>
        <p style="font-size: 16px; color: #555; margin-bottom: 24px;">
          <strong>${inviterName}</strong> has invited you to join 
          <strong>${organizationName}</strong> as a <strong>${roleLabel}</strong> on HomeschoolReady.
        </p>

        <a href="${acceptUrl}"
          style="display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; 
                 border-radius: 10px; font-weight: 700; font-size: 16px; text-decoration: none; margin-bottom: 24px;">
          Accept Invitation
        </a>

        <p style="font-size: 14px; color: #777; margin-bottom: 8px;">
          Or enter this code manually when signing up:
        </p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 12px 20px; 
                    font-family: monospace; font-size: 24px; font-weight: 700; 
                    letter-spacing: 6px; text-align: center; color: #1a1a1a; margin-bottom: 24px;">
          ${inviteCode}
        </div>

        <p style="font-size: 13px; color: #999;">
          This invitation expires in 14 days. If you didn't expect this email, you can safely ignore it.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #bbb;">The HomeschoolReady Team</p>
      </div>
    `,
  })

  if (error) {
    console.error('Resend error:', error)
    throw new Error(`Failed to send invite email: ${error.message}`)
  }

  return data
}