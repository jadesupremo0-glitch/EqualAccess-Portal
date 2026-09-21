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

async function main() {
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in environment.')
    console.error('Make sure .env exists in the project root (see .env.example).')
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
  console.log('Done! All demo data has been written to the database.')
}

main().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})