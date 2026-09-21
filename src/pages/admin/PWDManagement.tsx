import { useState } from 'react'
import { UserCheck, Eye, Edit2, UserX, Trash2 } from 'lucide-react'
import { type PWDUser } from '../../data'
import { Card, Button, SearchBar, Select, Input, statusBadge, Modal, Alert } from '../../components/ui'
import { useStore } from '../../store'
import {
  ALL_BARANGAYS_LABEL,
  BARANGAYS,
  BARANGAY_OPTIONS,
  DISABILITY_TYPES,
  OTHER_DISABILITY,
  barangayLabel,
  normalizeDisability,
  officialBarangay,
} from '../../lib/catalog'

function PWDDetailModal({ user, onClose, onEdit, onDelete }: { user: PWDUser; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const { verifyPWD, deactivatePWD } = useStore()
  return (
    <Modal open title={`PWD Profile — ${user.id}`} onClose={onClose} size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700" aria-hidden="true">
            {user.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
            <p className="text-gray-500 text-sm font-mono">{user.id}</p>
            <div className="mt-1">{statusBadge(user.verificationStatus)}</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 text-sm">
          {[
            { label: 'Address', value: user.address },
            { label: 'Barangay', value: user.barangay },
            { label: 'Contact', value: user.contact },
            { label: 'Email', value: user.email },
            { label: 'Disability Type', value: String(normalizeDisability(user.disabilityType)) },
            { label: 'PWD ID Number', value: user.pwdIdNumber },
            { label: 'Date Registered', value: user.dateRegistered },
            ...(user.age ? [{ label: 'Age', value: String(user.age) }] : []),
          ].map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium text-gray-500 mb-0.5">{f.label}</p>
              <p className="text-gray-900">{f.value}</p>
            </div>
          ))}
        </div>

        {user.verificationStatus === 'Pending' && (
          <div className="flex gap-3">
            <Button icon={<UserCheck size={15} />} className="flex-1" onClick={() => { verifyPWD(user.id, 'Verified'); onClose() }}>Verify Account</Button>
            <Button variant="danger" className="flex-1" onClick={() => { verifyPWD(user.id, 'Rejected'); onClose() }}>Reject Verification</Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={<Edit2 size={14} />} size="sm" onClick={onEdit}>Edit Profile</Button>
          <Button variant="outline" icon={<UserX size={14} />} size="sm" onClick={() => { deactivatePWD(user.id); onClose() }}>Deactivate</Button>
          <Button variant="danger" icon={<Trash2 size={14} />} size="sm" onClick={onDelete}>Delete Record</Button>
          <Button variant="outline" onClick={onClose} size="sm" className="ml-auto">Close</Button>
        </div>
      </div>
    </Modal>
  )
}

function EditPWDModal({ user, onClose }: { user: PWDUser; onClose: () => void }) {
  const { updatePWD } = useStore()
  const [form, setForm] = useState({
    name: user.name,
    contact: user.contact,
    email: user.email,
    address: user.address,
    barangay: user.barangay,
    disabilityType: String(normalizeDisability(user.disabilityType)),
  })
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // A stored barangay that is not on the official list stays selectable so editing other
  // fields never silently rewrites it; the admin can move the record when ready.
  const offList = user.barangay && !officialBarangay(user.barangay)
  const barangayOptions = offList ? [{ value: user.barangay, label: `${user.barangay} (not on official list)` }, ...BARANGAY_OPTIONS] : BARANGAY_OPTIONS
  const disabilityOptions = [...DISABILITY_TYPES, OTHER_DISABILITY].map((d) => ({ value: d, label: d }))
  const canSave = form.name.trim().length > 0

  return (
    <Modal open title={`Edit Profile — ${user.id}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        {offList && (
          <Alert type="warning" title="Barangay not on the official list" message={`This record says "${user.barangay}". Choose an official barangay to correct it, or leave it as is.`} />
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Full Name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          <Input label="Contact Number" value={form.contact} onChange={(e) => set('contact', e.target.value)} />
          <Input label="Email Address" value={form.email} onChange={(e) => set('email', e.target.value)} className="sm:col-span-2" />
          <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} className="sm:col-span-2" />
          <Select label="Barangay" options={barangayOptions} value={form.barangay} onChange={(v) => set('barangay', v)} />
          <Select label="Disability Type" options={disabilityOptions} value={form.disabilityType} onChange={(v) => set('disabilityType', v)} />
        </div>
        <div className="flex gap-3">
          <Button
            disabled={!canSave}
            onClick={() => {
              updatePWD(user.id, {
                name: form.name.trim(),
                contact: form.contact.trim(),
                email: form.email.trim(),
                address: form.address.trim(),
                barangay: form.barangay,
                disabilityType: form.disabilityType as PWDUser['disabilityType'],
              })
              onClose()
            }}
          >
            Save Changes
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}

function ConfirmDeleteModal({ user, onCancel, onConfirm }: { user: PWDUser; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal open title="Delete PWD record?" onClose={onCancel} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          <strong>{user.name}</strong> ({user.id}) will be removed from PWD Management, the dashboard, and reports. The record is kept in the database and can be restored by an administrator.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" onClick={onConfirm} className="flex-1">Delete Record</Button>
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function PWDManagement() {
  const { pwdUsers, verifyPWD, deactivatePWD, deletePWD } = useStore()
  const [search, setSearch] = useState('')
  const [barangayFilter, setBarangayFilter] = useState('')
  const [disabilityFilter, setDisabilityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<PWDUser | null>(null)
  const [editing, setEditing] = useState<PWDUser | null>(null)
  const [deleting, setDeleting] = useState<PWDUser | null>(null)

  // Filter lists come from the shared catalog, not from whatever values happen to be in the records.
  const barangays = BARANGAYS.map((b) => ({ value: b as string, label: barangayLabel(b) }))
  const hasOther = pwdUsers.some((u) => !(DISABILITY_TYPES as readonly string[]).includes(normalizeDisability(u.disabilityType)))
  const disabilities = [...DISABILITY_TYPES, ...(hasOther ? [OTHER_DISABILITY] : [])].map((d) => ({ value: d as string, label: d as string }))

  const filtered = pwdUsers.filter((u) => {
    const q = search.toLowerCase()
    const disability = normalizeDisability(u.disabilityType)
    const disabilityMatch = !disabilityFilter
      || disability === disabilityFilter
      || (disabilityFilter === OTHER_DISABILITY && !(DISABILITY_TYPES as readonly string[]).includes(disability))
    return (!search || u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      && (!barangayFilter || officialBarangay(u.barangay) === barangayFilter)
      && disabilityMatch
      && (!statusFilter || u.verificationStatus === statusFilter)
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PWD Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage PWD records and verifications</p>
        </div>
      </div>

      {/* Search & filters */}
      <div className="flex gap-3 flex-wrap items-end" role="group" aria-label="Filter PWD records">
        <div className="flex-1 min-w-52">
          <SearchBar value={search} onChange={setSearch} placeholder="Search name, ID, email..." />
        </div>
        <div className="min-w-40">
          <Select label="" ariaLabel="Filter by barangay" options={barangays} value={barangayFilter} onChange={setBarangayFilter} placeholder={ALL_BARANGAYS_LABEL} />
        </div>
        <div className="min-w-44">
          <Select label="" ariaLabel="Filter by disability type" options={disabilities} value={disabilityFilter} onChange={setDisabilityFilter} placeholder="All Disability Types" />
        </div>
        <div className="min-w-36">
          <Select label="" ariaLabel="Filter by verification status" options={[
            { value: 'Verified', label: 'Verified' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Rejected', label: 'Rejected' },
          ]} value={statusFilter} onChange={setStatusFilter} placeholder="All Statuses" />
        </div>
        {(search || barangayFilter || disabilityFilter || statusFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setBarangayFilter(''); setDisabilityFilter(''); setStatusFilter('') }}>
            Clear
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-500" role="status">{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="PWD records table">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                {['PWD ID', 'Full Name', 'Barangay', 'Disability Type', 'Verification', 'Registered', 'Actions'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{u.id}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{u.barangay}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{normalizeDisability(u.disabilityType)}</td>
                  <td className="px-4 py-3">{statusBadge(u.verificationStatus)}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{u.dateRegistered}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setSelected(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" aria-label={`View ${u.name}'s profile`}>
                        <Eye size={15} />
                      </button>
                      {u.verificationStatus === 'Pending' && (
                        <button className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" aria-label={`Verify ${u.name}`} onClick={() => verifyPWD(u.id, 'Verified')}>
                          <UserCheck size={15} />
                        </button>
                      )}
                      <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}>
                        <Edit2 size={15} />
                      </button>
                      <button className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" aria-label={`Deactivate ${u.name}`} onClick={() => deactivatePWD(u.id)}>
                        <UserX size={15} />
                      </button>
                      <button className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" aria-label={`Delete ${u.name}`} onClick={() => setDeleting(u)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-500">No records found matching your filters.</div>
          )}
        </div>
      </Card>

      {selected && (
        <PWDDetailModal
          user={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null) }}
          onDelete={() => { setDeleting(selected); setSelected(null) }}
        />
      )}
      {editing && <EditPWDModal user={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDeleteModal
          user={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => { deletePWD(deleting.id); setDeleting(null) }}
        />
      )}
    </div>
  )
}
