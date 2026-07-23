import { useState } from 'react'
import { User, Shield, FileText, Camera, Edit2, CheckCircle } from 'lucide-react'
import { pwdUsers } from '../../data'
import { Card, Button, Input, PasswordInput, Alert, statusBadge } from '../../components/ui'
import { usePWDSession } from '../../context'

export default function Profile() {
  const session = usePWDSession()
  const user = session ? pwdUsers.find((u) => u.id === session.userId) : pwdUsers[0]
  const currentUser = user ?? pwdUsers[0]

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    fullName: currentUser.name,
    address: currentUser.address,
    barangay: currentUser.barangay,
    contact: currentUser.contact,
    email: currentUser.email,
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your personal information and account settings</p>
        </div>
        {!editing && (
          <Button variant="outline" icon={<Edit2 size={15} />} onClick={() => setEditing(true)}>
            Edit Profile
          </Button>
        )}
      </div>

      {saved && <Alert type="success" title="Profile Updated" message="Your profile information has been successfully updated." />}

      {/* Avatar + basic info */}
      <Card className="p-6">
        <div className="flex items-start gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center overflow-hidden">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-blue-400" />
              )}
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center shadow-md hover:bg-blue-800 transition-colors" aria-label="Change photo">
              <Camera size={13} className="text-white" />
            </button>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{currentUser.name}</h2>
            <p className="text-gray-500 text-sm">{currentUser.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {statusBadge(currentUser.verificationStatus)}
              <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">{currentUser.id}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Personal Information */}
      <Card>
        <div className="flex items-center gap-2 p-5 border-b border-gray-100">
          <User size={18} className="text-blue-700" />
          <h3 className="font-semibold text-gray-900">Personal Information</h3>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          {editing ? (
            <>
              <Input label="Full Name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
              <Input label="Contact Number" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
              <Input label="Email Address" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="sm:col-span-2" />
              <Input label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="sm:col-span-2" />
              <Input label="Barangay" value={form.barangay} onChange={(e) => setForm((f) => ({ ...f, barangay: e.target.value }))} />
            </>
          ) : (
            <>
              {[
                { label: 'Full Name', value: form.fullName },
                { label: 'Contact Number', value: form.contact },
                { label: 'Email Address', value: form.email },
                { label: 'Address', value: form.address },
                { label: 'Barangay', value: form.barangay },
              ].map((f) => (
                <div key={f.label} className={f.label === 'Email Address' || f.label === 'Address' ? 'sm:col-span-2' : ''}>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">{f.label}</p>
                  <p className="text-sm text-gray-900">{f.value}</p>
                </div>
              ))}
            </>
          )}
        </div>
        {editing && (
          <div className="flex gap-3 px-5 pb-5">
            <Button onClick={handleSave} icon={<CheckCircle size={15} />}>Save Changes</Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        )}
      </Card>

      {/* Disability Information */}
      <Card>
        <div className="flex items-center gap-2 p-5 border-b border-gray-100">
          <FileText size={18} className="text-blue-700" />
          <h3 className="font-semibold text-gray-900">Disability Information</h3>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Type of Disability</p>
            <p className="text-sm text-gray-900">{currentUser.disabilityType}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">PWD ID Number</p>
            <p className="text-sm font-mono text-gray-900">{currentUser.pwdIdNumber}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Date Registered</p>
            <p className="text-sm text-gray-900">{currentUser.dateRegistered}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Verification Status</p>
            <div className="mt-0.5">{statusBadge(currentUser.verificationStatus)}</div>
          </div>
          {(currentUser as any).skills && (currentUser as any).skills.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-gray-500 mb-1.5">Registered Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {(currentUser as any).skills.map((s: string) => (
                  <span key={s} className="text-xs bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 pb-5">
          <Button variant="outline" size="sm">Update PWD ID Documents</Button>
        </div>
      </Card>

      {/* Account Security */}
      <Card>
        <div className="flex items-center gap-2 p-5 border-b border-gray-100">
          <Shield size={18} className="text-blue-700" />
          <h3 className="font-semibold text-gray-900">Account Security</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <PasswordInput label="Current Password" placeholder="Enter current password" value="" onChange={() => {}} />
            <div />
            <PasswordInput label="New Password" placeholder="Enter new password" value="" onChange={() => {}} />
            <PasswordInput label="Confirm New Password" placeholder="Re-enter new password" value="" onChange={() => {}} />
          </div>
          <Button variant="outline" icon={<Shield size={15} />}>Change Password</Button>
        </div>
      </Card>
    </div>
  )
}
