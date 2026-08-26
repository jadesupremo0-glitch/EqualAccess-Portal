import { useState } from 'react'
import { UserCheck, Eye, Edit2, UserX } from 'lucide-react'
import { type PWDUser } from '../../data'
import { Card, Button, SearchBar, Select, statusBadge, Modal } from '../../components/ui'
import { useStore } from '../../store'

function PWDDetailModal({ user, onClose }: { user: PWDUser; onClose: () => void }) {
  const { verifyPWD, deactivatePWD } = useStore()
  return (
    <Modal open title={`PWD Profile — ${user.id}`} onClose={onClose} size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700">
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
            { label: 'Disability Type', value: user.disabilityType },
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

        <div className="flex gap-2">
          <Button variant="outline" icon={<Edit2 size={14} />} size="sm">Edit Profile</Button>
          <Button variant="outline" icon={<UserX size={14} />} size="sm" onClick={() => { deactivatePWD(user.id); onClose() }}>Deactivate</Button>
          <Button variant="outline" onClick={onClose} size="sm" className="ml-auto">Close</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function PWDManagement() {
  const { pwdUsers, verifyPWD, deactivatePWD } = useStore()
  const [search, setSearch] = useState('')
  const [barangayFilter, setBarangayFilter] = useState('')
  const [disabilityFilter, setDisabilityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<PWDUser | null>(null)

  const barangays = [...new Set(pwdUsers.map((u) => u.barangay))].map((b) => ({ value: b, label: b }))
  const disabilities = [...new Set(pwdUsers.map((u) => u.disabilityType))].map((d) => ({ value: d, label: d }))

  const filtered = pwdUsers.filter((u) => {
    const q = search.toLowerCase()
    return (!search || u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      && (!barangayFilter || u.barangay === barangayFilter)
      && (!disabilityFilter || u.disabilityType === disabilityFilter)
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
      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-52">
          <SearchBar value={search} onChange={setSearch} placeholder="Search name, ID, email..." />
        </div>
        <div className="min-w-40">
          <Select label="" options={barangays} value={barangayFilter} onChange={setBarangayFilter} placeholder="All Barangays" />
        </div>
        <div className="min-w-44">
          <Select label="" options={disabilities} value={disabilityFilter} onChange={setDisabilityFilter} placeholder="All Disability Types" />
        </div>
        <div className="min-w-36">
          <Select label="" options={[
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

      <p className="text-sm text-gray-500">{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="PWD records table">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                {['PWD ID', 'Full Name', 'Barangay', 'Disability Type', 'Verification', 'Registered', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
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
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{u.barangay}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{u.disabilityType}</td>
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
                      <button className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" aria-label={`Edit ${u.name}`}>
                        <Edit2 size={15} />
                      </button>
                      <button className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" aria-label={`Deactivate ${u.name}`} onClick={() => deactivatePWD(u.id)}>
                        <UserX size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400">No records found matching your filters.</div>
          )}
        </div>
      </Card>

      {selected && <PWDDetailModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
