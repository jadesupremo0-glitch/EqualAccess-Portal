import 'dotenv/config'
import {
  pwdUsers as seedPWDUsers,
  benefits as seedBenefits,
  assistanceRequests as seedRequests,
  notifications as seedNotifications,
  jobs as seedJobs,
  adminUsers as seedAdminUsers,
  feedbackTickets as seedFeedback,
  activityLog as seedActivityLog,
} from '../src/data'
import { resetSupabaseData } from '../src/lib/db'
import { supabase, hasServiceRole } from '../src/lib/supabase'
import { provisionAuthUsers } from './lib/provision-auth'

async function main() {
  if (!supabase || !hasServiceRole) {
    console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in environment (scripts need the service-role key since Row Level Security is on).')
    console.error('Make sure .env exists in the project root (see .env.example).')
    process.exit(1)
  }

  const pwdPassword = process.env.DEMO_PWD_PASSWORD
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD
  if (!pwdPassword || pwdPassword.length < 12 || !adminPassword || adminPassword.length < 12) {
    console.error('Set DEMO_PWD_PASSWORD and DEMO_ADMIN_PASSWORD (12+ characters) in .env for the demo accounts.')
    process.exit(1)
  }

  const seed = {
    pwdUsers: seedPWDUsers,
    benefits: seedBenefits,
    assistanceRequests: seedRequests,
    notifications: seedNotifications,
    jobs: seedJobs,
    adminUsers: seedAdminUsers,
    feedbackTickets: seedFeedback,
    activityLog: seedActivityLog,
  }

  console.log('Seeding Supabase database...')
  await resetSupabaseData(seed)
  // Demo sign-ins live in Supabase Auth (created, or given their demo password again).
  // The passwords in src/data.ts are public (offline demo only); the database gets the private ones.
  await provisionAuthUsers(supabase, [
    ...seedPWDUsers.map((u) => ({ kind: 'pwd' as const, id: u.id, password: pwdPassword })),
    ...seedAdminUsers.map((a) => ({ kind: 'admin' as const, id: a.id, password: adminPassword })),
  ])
  console.log('Done! All demo data has been written to the database.')
}

main().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})