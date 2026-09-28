import { useEffect, useState } from 'react'
import { User, Shield, Bell, AlertCircle, Trash2 } from 'lucide-react'
import { Card, Button } from '../../components/ui'
import ChangePasswordForm from '../../components/ChangePasswordForm'
import { useCurrentPWD } from '../../context'

const PREFS_KEY = 'equalaccess-portal:prefs:v1'

export default function PWDSettings() {
  const currentUser = useCurrentPWD()

  const [prefs, setPrefs] = useState(() => {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return { email: true, sms: true, requestUpdates: true, promos: false }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch { /* ignore */ }
  }, [prefs])

  const toggle = (k: string) => setPrefs((p: Record<string, boolean>) => ({ ...p, [k]: !p[k] }))

  return (
    <div className="grid gap-6 xl:grid-cols-2 items-start">
      <div className="xl:col-span-2">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Account settings and preferences</p>
      </div>

      {/* Account overview */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <User size={18} className="text-blue-700" />
          <h3 className="font-semibold text-gray-900">Account Overview</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Full Name', value: currentUser.name },
            { label: 'Account ID', value: currentUser.id },
            { label: 'Username', value: currentUser.username },
            { label: 'PWD ID Number', value: currentUser.pwdIdNumber },
            { label: 'Barangay', value: currentUser.barangay },
            { label: 'Verification', value: currentUser.verificationStatus },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium text-gray-500 mb-0.5">{f.label}</p>
              <p className="text-gray-900">{f.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Change password */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={18} className="text-blue-700" />
          <h3 className="font-semibold text-gray-900">Change Password</h3>
        </div>
        <ChangePasswordForm userId={currentUser.id} />
      </Card>

      {/* Notification preferences */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell size={18} className="text-blue-700" />
          <h3 className="font-semibold text-gray-900">Notification Preferences</h3>
        </div>
        <div className="space-y-3">
          {[
            { key: 'email', label: 'Email Notifications', desc: 'Receive account and request updates via email' },
            { key: 'sms', label: 'SMS Notifications', desc: 'Receive updates via SMS to your registered number' },
            { key: 'requestUpdates', label: 'Request Status Updates', desc: 'Get notified whenever a request status changes' },
            { key: 'promos', label: 'Program Announcements', desc: 'Get notified about new programs and benefits' },
          ].map((o) => (
            <label key={o.key} className="flex items-center justify-between gap-4 py-2 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-900">{o.label}</p>
                <p className="text-xs text-gray-500">{o.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[o.key]}
                onClick={() => toggle(o.key)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${prefs[o.key] ? 'bg-teal-600' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${prefs[o.key] ? 'translate-x-5' : ''}`} />
              </button>
            </label>
          ))}
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="p-6 border-red-100">
        <div className="flex items-center gap-3 mb-2">
          <Trash2 size={18} className="text-red-600" />
          <h3 className="font-semibold text-gray-900">Danger Zone</h3>
        </div>
        <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5">
          <AlertCircle size={13} className="text-red-400" />
          Requesting account deactivation requires contacting the PDAO. To delete your data, contact the PDAO office.
        </p>
        <Button variant="outline" disabled>Request Account Deactivation</Button>
      </Card>
    </div>
  )
}
