import { useState } from 'react'
import { Plus, Edit2, UserX, UserCheck, Trash2, Key } from 'lucide-react'
import { type AdminUser } from '../../data'
import { Card, Button, Tabs, statusBadge, Modal, Input, Select, PasswordInput, Alert } from '../../components/ui'
import { useStore } from '../../store'
import { useAdminSession } from '../../context'

const ROLE_OPTIONS = [
  { value: 'Administrator', label: 'Administrator' },
  { value: 'Benefits Officer', label: 'Benefits Officer' },
  { value: 'Social Worker', label: 'Social Worker' },
  { value: 'Records Officer', label: 'Records Officer' },
]

function AddUserModal({ onClose }: { onClose: () => void }) {
  const { addAdminUser } = useStore()
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    contact: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
  })
  const [error, setError] = useState('')

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.fullName || !form.username || !form.contact || !form.password || !form.role) {
      setError('Please fill in all required fields.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    const result = addAdminUser({
      name: form.fullName,
      position: form.role,
      username: form.username,
      password: form.password,
      contact: form.contact,
      email: form.email || undefined,
      role: form.role as AdminUser['role'],
    })
    if (result) {
      setError(result)
      return
    }
    onClose()
  }

  return (
    <Modal open title="Add New Admin User" onClose={onClose} size="md">
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}
        <Input label="Full Name" placeholder="e.g., Juan dela Cruz" value={form.fullName} onChange={(e) => set('fullName')(e.target.value)} required />
        <Input label="Username" placeholder="e.g., admin.juan" value={form.username} onChange={(e) => set('username')(e.target.value)} required />
        <Input label="Contact Number" placeholder="e.g., +63 917 123 4567" value={form.contact} onChange={(e) => set('contact')(e.target.value)} required />
        <Input label="Email Address" type="email" placeholder="juan@equalaccess.gov.ph (optional)" value={form.email} onChange={(e) => set('email')(e.target.value)} />
        <Select
          label="Role"
          options={ROLE_OPTIONS}
          value={form.role}
          onChange={set('role')}
          placeholder="Select role"
          required
        />
        <PasswordInput label="Password" placeholder="Min. 8 characters" value={form.password} onChange={(e) => set('password')(e.target.value)} required />
        <PasswordInput label="Confirm Password" placeholder="Re-enter password" value={form.confirmPassword} onChange={(e) => set('confirmPassword')(e.target.value)} required />
        <div className="flex gap-3 pt-2">
          <Button fullWidth onClick={handleSubmit}>Create User</Button>
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}

function EditUserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { updateAdminUser, logActivity } = useStore()
  const [form, setForm] = useState({
    name: user.name,
    position: user.position,
    username: user.username,
    contact: user.contact ?? '',
    email: user.email ?? '',
    role: user.role,
  })
  const [error, setError] = useState('')

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim() || !form.username.trim() || !form.role) {
      setError('Name, username, and role are required.')
      return
    }
    updateAdminUser(user.id, {
      name: form.name.trim(),
      position: form.position.trim() || form.role,
      username: form.username.trim(),
      contact: form.contact.trim(),
      email: form.email.trim() || undefined,
      role: form.role,
    })
    logActivity('Updated Admin User', `Updated admin account ${form.username.trim()} (${user.id})`)
    onClose()
  }

  return (
    <Modal open title={`Edit User — ${user.username}`} onClose={onClose} size="md">
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}
        <Input label="Full Name" placeholder="e.g., Juan dela Cruz" value={form.name} onChange={(e) => set('name')(e.target.value)} required />
        <Input label="Position" placeholder="e.g., Intake Officer" value={form.position} onChange={(e) => set('position')(e.target.value)} />
        <Input label="Username" placeholder="e.g., admin.juan" value={form.username} onChange={(e) => set('username')(e.target.value)} required />
        <Input label="Contact Number" placeholder="e.g., +63 917 123 4567" value={form.contact} onChange={(e) => set('contact')(e.target.value)} />
        <Input label="Email Address" type="email" placeholder="juan@equalaccess.gov.ph (optional)" value={form.email} onChange={(e) => set('email')(e.target.value)} />
        <Select label="Role" options={ROLE_OPTIONS} value={form.role} onChange={set('role')} required />
        <div className="flex gap-3 pt-2">
          <Button fullWidth onClick={handleSave}>Save Changes</Button>
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}

function ResetPasswordModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { resetAdminPassword } = useStore()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const handleSave = () => {
    if (pw.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (pw !== confirm) {
      setError('Passwords do not match.')
      return
    }
    resetAdminPassword(user.id, pw)
    onClose()
  }

  return (
    <Modal open title={`Reset Password — ${user.username}`} onClose={onClose} size="md">
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}
        <PasswordInput label="New Password" placeholder="Min. 8 characters" value={pw} onChange={(e) => setPw(e.target.value)} required />
        <PasswordInput label="Confirm New Password" placeholder="Re-enter new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <div className="flex gap-3 pt-2">
          <Button fullWidth onClick={handleSave}>Reset Password</Button>
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}

function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onClose }: {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal open title={title} onClose={onClose} size="sm">
      <div className="space-y-5">
        <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <Button fullWidth variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function UserManagement() {
  const { adminUsers, activityLog, toggleAdminStatus, deleteAdminUser } = useStore()
  const session = useAdminSession()
  const [tab, setTab] = useState('Users')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [resetting, setResetting] = useState<AdminUser | null>(null)
  const [confirming, setConfirming] = useState<{ user: AdminUser; kind: 'deactivate' | 'activate' | 'delete' } | null>(null)
  const [actionError, setActionError] = useState('')
  const selfId = session?.adminId ?? ''

  const roleColors: Record<string, string> = {
    Administrator: 'bg-purple-50 text-purple-700',
    'Benefits Officer': 'bg-blue-50 text-blue-700',
    'Social Worker': 'bg-green-50 text-green-700',
    'Records Officer': 'bg-amber-50 text-amber-700',
  }

  const requestAction = (user: AdminUser, kind: 'deactivate' | 'activate' | 'delete') => {
    setActionError('')
    if (user.id === selfId) {
      setActionError(kind === 'delete' ? 'You cannot delete your own account.' : 'You cannot change the status of your own account.')
      return
    }
    if (kind !== 'activate' && user.role === 'Administrator') {
      const activeAdmins = adminUsers.filter((a) => a.role === 'Administrator' && a.status === 'Active').length
      if (activeAdmins <= 1) {
        setActionError('The last active Administrator account cannot be removed or disabled.')
        return
      }
    }
    setConfirming({ user, kind })
  }

  const runConfirm = () => {
    if (!confirming) return
    if (confirming.kind === 'delete') deleteAdminUser(confirming.user.id)
    else toggleAdminStatus(confirming.user.id)
    setConfirming(null)
  }

  const confirmCopy = (() => {
    if (!confirming) return null
    const { user, kind } = confirming
    if (kind === 'delete') {
      return {
        title: 'Delete User',
        message: `Delete ${user.name} (${user.username})? Their account will be removed and they will no longer be able to sign in. This cannot be undone.`,
        label: 'Delete User',
        danger: true,
      }
    }
    if (kind === 'deactivate') {
      return {
        title: 'Deactivate User',
        message: `Deactivate ${user.name} (${user.username})? They will no longer be able to sign in until reactivated.`,
        label: 'Deactivate',
        danger: true,
      }
    }
    return {
      title: 'Reactivate User',
      message: `Reactivate ${user.name} (${user.username})? They will be able to sign in again.`,
      label: 'Reactivate',
      danger: false,
    }
  })()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage administrator and staff accounts</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>Add User</Button>
      </div>

      <Tabs tabs={['Users', 'Activity Log']} active={tab} onChange={setTab} />

      {tab === 'Users' && (
        <>
          {actionError && <Alert type="error" message={actionError} />}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Admin users table">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left">
                    {['Name', 'Role', 'Username', 'Contact', 'Status', 'Last Login', 'Date Created', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {adminUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 whitespace-nowrap">{u.name}</p>
                            <p className="text-xs text-gray-400">{u.position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{u.username}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{u.contact || '—'}</td>
                      <td className="px-4 py-3">{statusBadge(u.status)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{u.lastLogin}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{u.dateCreated}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditing(u)} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-lg" aria-label={`Edit ${u.name}`}><Edit2 size={14} /></button>
                          <button onClick={() => setResetting(u)} className="p-1.5 text-amber-400 hover:bg-amber-50 hover:text-amber-600 rounded-lg" aria-label={`Reset ${u.name}'s password`}><Key size={14} /></button>
                          {u.status === 'Active' ? (
                            <button onClick={() => requestAction(u, 'deactivate')} className="p-1.5 text-orange-400 hover:bg-orange-50 hover:text-orange-600 rounded-lg" aria-label={`Deactivate ${u.name}`}><UserX size={14} /></button>
                          ) : (
                            <button onClick={() => requestAction(u, 'activate')} className="p-1.5 text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg" aria-label={`Reactivate ${u.name}`}><UserCheck size={14} /></button>
                          )}
                          <button onClick={() => requestAction(u, 'delete')} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg" aria-label={`Delete ${u.name}`}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'Activity Log' && (
        <Card>
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">System Activity Log</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Activity log">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  {['User', 'Action', 'Date', 'Time', 'Description'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activityLog.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{log.user}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{log.date}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{log.time}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{log.activity}</td>
                  </tr>
                ))}
                {activityLog.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No activity yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} />}
      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}
      {confirming && confirmCopy && (
        <ConfirmModal
          title={confirmCopy.title}
          message={confirmCopy.message}
          confirmLabel={confirmCopy.label}
          danger={confirmCopy.danger}
          onConfirm={runConfirm}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  )
}