import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { Alert, Button, PasswordInput } from './ui'
import { useStore } from '../store'

/** Current / new / confirm password fields for a PWD account (used on My Profile and Settings). */
export default function ChangePasswordForm({ userId }: { userId: string }) {
  const { changePassword } = useStore()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!current || !next) { setError('Please fill in all password fields.'); return }
    if (next !== confirm) { setError('New passwords do not match.'); return }
    setBusy(true)
    const err = await changePassword(userId, current, next)
    setBusy(false)
    if (err) { setError(err); return }
    setError('')
    setCurrent(''); setNext(''); setConfirm('')
    setDone(true)
    setTimeout(() => setDone(false), 3000)
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error" message={error} />}
      {done && <Alert type="success" title="Password Changed" message="Your password has been updated successfully." />}
      <div className="grid sm:grid-cols-2 gap-4">
        <PasswordInput label="Current Password" placeholder="Enter current password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        <div />
        <PasswordInput label="New Password" placeholder="Min. 8 characters" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <PasswordInput label="Confirm New Password" placeholder="Re-enter new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </div>
      <Button onClick={submit} disabled={busy} icon={<CheckCircle size={15} />}>{busy ? 'Updating...' : 'Update Password'}</Button>
    </div>
  )
}
