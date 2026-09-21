import { useState } from 'react'
import { User, Shield, FileText, Camera, Edit2, CheckCircle, Upload } from 'lucide-react'
import { Card, Button, Input, PasswordInput, Select, Alert, statusBadge, Modal, FileUpload } from '../../components/ui'
import { usePWDSession } from '../../context'
import { useStore } from '../../store'
import EmploymentProfile from './EmploymentProfile'
import { BARANGAY_OPTIONS, normalizeDisability, officialBarangay } from '../../lib/catalog'

export default function Profile() {
  const session = usePWDSession()
  const { pwdUsers, updateProfile, changePassword } = useStore()
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

  // password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  // document upload
  const [docModal, setDocModal] = useState(false)
  const [docSent, setDocSent] = useState(false)

  const handleSave = () => {
    updateProfile(currentUser.id, {
      name: form.fullName,
      address: form.address,
      barangay: form.barangay,
      contact: form.contact,
      email: form.email,
    })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handlePassword = () => {
    if (!currentPw || !newPw) { setPwError('Please fill in all password fields.'); return }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return }
    const err = changePassword(currentUser.id, currentPw, newPw)
    if (err) { setPwError(err); return }
    setPwError('')
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setPwSaved(true)
    setTimeout(() => setPwSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
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
        <div className="p-5 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {editing ? (
            <>
              <Input label="Full Name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
              <Input label="Contact Number" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
              <Input label="Email Address" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="sm:col-span-2" />
              <Input label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="sm:col-span-2" />
              <Select
                label="Barangay"
                options={!currentUser.barangay || officialBarangay(currentUser.barangay) ? BARANGAY_OPTIONS : [{ value: currentUser.barangay, label: `${currentUser.barangay} (not on official list)` }, ...BARANGAY_OPTIONS]}
                value={form.barangay}
                onChange={(v) => setForm((f) => ({ ...f, barangay: v }))}
                placeholder="Select your barangay"
              />
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
        <div className="p-5 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Type of Disability</p>
            <p className="text-sm text-gray-900">{normalizeDisability(currentUser.disabilityType)}</p>
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
        </div>
        <div className="px-5 pb-5">
          <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setDocModal(true)}>Update PWD ID Documents</Button>
        </div>
      </Card>

      <EmploymentProfile user={currentUser} />

      {/* Account Security */}
      <Card>
        <div className="flex items-center gap-2 p-5 border-b border-gray-100">
          <Shield size={18} className="text-blue-700" />
          <h3 className="font-semibold text-gray-900">Account Security</h3>
        </div>
        <div className="p-5 space-y-4">
          {pwError && <Alert type="error" message={pwError} />}
          {pwSaved && <Alert type="success" title="Password Changed" message="Your password has been updated successfully." />}
          <div className="grid sm:grid-cols-2 gap-4">
            <PasswordInput label="Current Password" placeholder="Enter current password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
            <div />
            <PasswordInput label="New Password" placeholder="Enter new password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            <PasswordInput label="Confirm New Password" placeholder="Re-enter new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
          <Button variant="outline" icon={<Shield size={15} />} onClick={handlePassword}>Change Password</Button>
        </div>
      </Card>

      <Modal open={docModal} onClose={() => setDocModal(false)} title="Update PWD ID Documents" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Upload a clear photo or scan of your PWD ID. The PDAO will review and update your verification status.
          </p>
          <FileUpload label="PWD ID — Front Side" accept=".jpg,.jpeg,.png,.pdf" helperText="JPG, PNG, or PDF · Max 5 MB" />
          <FileUpload label="PWD ID — Back Side" accept=".jpg,.jpeg,.png,.pdf" helperText="JPG, PNG, or PDF · Max 5 MB" />
          {docSent && <Alert type="success" title="Documents Submitted" message="Your documents have been submitted for PDAO review." />}
          <div className="flex gap-3">
            <Button fullWidth onClick={() => { setDocSent(true); setTimeout(() => { setDocModal(false); setDocSent(false) }, 1500) }}>
              Submit for Review
            </Button>
            <Button variant="outline" fullWidth onClick={() => setDocModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
