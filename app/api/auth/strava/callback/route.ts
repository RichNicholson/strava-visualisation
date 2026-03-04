import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=access_denied`)
  }

  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=misconfigured`)
  }

  // Exchange code for token (server-side, protects client_secret)
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=token_exchange_failed`)
  }

  const tokenData = await tokenRes.json()
  const { access_token, expires_at } = tokenData

  // Set access token as a JS-readable cookie.
  // NOT httpOnly — the browser needs to read it to call Strava directly.
  // The client_secret is the real secret; it never leaves the server.
  // Activity data fetched by the browser goes straight to IndexedDB, never to our server.
  const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)
  response.cookies.set('strava_access_token', access_token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: expires_at - Math.floor(Date.now() / 1000),
    path: '/',
    sameSite: 'lax',
  })

  return response
}
