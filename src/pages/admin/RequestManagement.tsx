import { useState } from 'react'
import { Eye, CheckCircle, XCircle, MessageSquare, FileText } from 'lucide-react'
import { assistanceRequests, type AssistanceRequest } from '../../data'
import { Card, Button, Tabs, SearchBar, statusBadge, Modal, Timeline, Textarea, Alert } from '../../components/ui'

const ALL_TABS = ['All', 'Pending', 'Under Review', 'Approved', 'Rejected', 'Completed']

function RequestDetailModal({ req, onClose }: { req: AssistanceRequest; onClose: () => void }) {
  const [comment, setComment] = useState('')
  const [updated, setUpdated] = useState(false)

  return (
    <Modal open title={`Request — ${req.id}`} onClose={onClose} size="xl">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-5">
          {/* PWD Info */}
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">PWD Information</p>
            <div className="bg-gray-50 rounded-xl p-4 grid sm:grid-cols-2 gap-2 text-sm">
              <div><p className="text-gray-500 text-xs">Name</p><p className="font-medium">{req.pwdName}</p></div>
              <div><p className="text-gray-500 text-xs">PWD ID</p><p className="font-mono text-xs">{req.pwdId}</p></div>
            </div>
          </div>
          {/* Request details */}
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Request Details</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Type:</span><span>{req.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status:</span>{statusBadge(req.status)}</div>
              <div className="flex justify-between"><span className="text-gray-500">Submitted:</span><span>{req.dateSubmitted}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Assigned to:</span><span>{req.assignedStaff}</span></div>
            </div>
          </div>
          {/* Description */}
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Description</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">{req.description}</p>
          </div>
          {/* Comments */}
          {req.comments.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Comments</p>
              {req.comments.map((c, i) => (
                <div key={i} className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-2">
                  <div className="flex justify-between mb-1">
                    <p className="text-xs font-semibold text-blue-800">{c.author}</p>
                    <p className="text-xs text-blue-400">{c.date}</p>
                  </div>
                  <p className="text-sm text-blue-900">{c.message}</p>
                </div>
              ))}
            </div>
          )}
          {/* Admin actions */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-500">Admin Actions</p>
            {updated && <Alert type="success" message="Action performed successfully." />}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={<CheckCircle size={14} />} onClick={() => setUpdated(true)}>Approve</Button>
              <Button size="sm" variant="danger" icon={<XCircle size={14} />} onClick={() => setUpdated(true)}>Reject</Button>
              <Button size="sm" variant="outline" icon={<FileText size={14} />} onClick={() => setUpdated(true)}>Request Documents</Button>
            </div>
            <Textarea label="Add Comment" value={comment} onChange={setComment} placeholder="Write a comment for the PWD user..." rows={3} />
            <Button size="sm" variant="secondary" icon={<MessageSquare size={14} />} disabled={!comment.trim()} onClick={() => { setUpdated(true); setComment('') }}>
              Send Comment
            </Button>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-3">Request Timeline</p>
          <Timeline steps={req.timeline} />
        </div>
      </div>
    </Modal>
  )
}

export default function RequestManagement() {
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AssistanceRequest | null>(null)

  const filtered = assistanceRequests.filter((r) => {
    const q = search.toLowerCase()
    const matchTab = tab === 'All' || r.status === tab
    const matchSearch = !search || r.pwdName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)
    return matchTab && matchSearch
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assistance Request Management</h1>
        <p className="text-gray-500 text-sm mt-0.5">Review and manage PWD assistance requests</p>
      </div>

      <Tabs tabs={ALL_TABS} active={tab} onChange={setTab} />

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, request ID, or type..." />

      <p className="text-sm text-gray-500">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</p>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Assistance requests table">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                {['Request ID', 'PWD Name', 'Type', 'Submitted', 'Status', 'Assigned Staff', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.pwdName}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.type}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{r.dateSubmitted}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.assignedStaff}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" aria-label={`View request ${r.id}`}>
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No requests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && <RequestDetailModal req={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
