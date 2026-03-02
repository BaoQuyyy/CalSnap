/**
 * Returns the app's base URL for auth redirects.
 * On Vercel: uses VERCEL_URL (e.g. your-app.vercel.app)
 * Locally: uses localhost:3000
 * Override with NEXT_PUBLIC_APP_URL for custom domains
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}
