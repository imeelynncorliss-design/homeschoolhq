import { signUp } from '@/src/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  const { data, error } = await signUp(email, password)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Check your email to confirm your account',
    user: data.user 
  })
}