import { useState } from 'react'
import { Plus, Edit2, UserX, Trash2, Key } from 'lucide-react'
import { adminUsers, activityLog } from '../../data'
import { Card, Button, Tabs, statusBadge, Modal, Input, Select } from '../../components/ui'

function AddUserModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal open title="Add New Admin User" onClose={onClose} size="md">
      <div className="space-y-4">
        <Input label="Full Name" placeholder="e.g., Juan dela Cruz" value="" onChange={() => {}} required />
        <Input label="Position" placeholder="e.g., Benefits Officer" value="" onChange={() => {}} required />
        <Input label="Username" placeholder="e.g., benefits.juan" value="" onChange={() => {}} required />
        <Input label="Email Address" type="email" placeholder="juan@quezoncity.gov.ph" value="" onChange={() => {}} required />
        <Select
          label="Role"
          options={[
            { value: 'Administrator', label: 'Administrator' },
            { value: 'Benefits Officer', label: 'Benefits Officer' },
            { value: 'Social Worker', label: 'Social Worker' },
            { value: 'Records Officer', label: 'Records Officer' },
          ]}
          value=""
          onChange={() => {}}
          placeholder="Select role"
          required
        />
        <div className="flex gap-3 pt-2">
          <Button fullWidth onClick={onClose}>Create User</Button>
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function UserManagement() {
  const [tab, setTab] = useState('Users')
  const [showAdd, setShowAdd] = useState(false)

  const roleColors: Record<string, string> = {
    Administrator: 'bg-purple-50 text-purple-700',
    'Benefits Officer': 'bg-blue-50 text-blue-700',
    'Social Worker': 'bg-green-50 text-green-700',
    'Records Officer': 'bg-amber-50 text-amber-700',
  }

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
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Admin users table">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  {['Name', 'Role', 'Username', 'Status', 'Last Login', 'Date Created', 'Actions'].map((h) => (
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
                    <td className="px-4 py-3">{statusBadge(u.status)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{u.lastLogin}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.dateCreated}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg" aria-label={`Edit ${u.name}`}><Edit2 size={14} /></button>
                        <button className="p-1.5 text-amber-400 hover:bg-amber-50 rounded-lg" aria-label={`Reset ${u.name}'s password`}><Key size={14} /></button>
                        <button className="p-1.5 text-orange-400 hover:bg-orange-50 rounded-lg" aria-label={`Deactivate ${u.name}`}><UserX size={14} /></button>
                        <button className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" aria-label={`Delete ${u.name}`}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
