import { useState } from 'react'
import { ClipboardList, ChevronRight } from 'lucide-react'
import { assistanceRequests, pwdUsers, type AssistanceRequest } from '../../data'
import { Card, Timeline, statusBadge, Modal } from '../../components/ui'
import { usePWDSession } from '../../context'

function TrackingCard({ req, onSelect }: { req: AssistanceRequest; onSelect: () => void }) {
  const completedSteps = req.timeline.filter((s) => s.completed).length
  const totalSteps = req.timeline.length
  const pct = Math.round((completedSteps / totalSteps) * 100)

  const barColor: Record<string, string> = {
    Pending: 'bg-amber-400',
    'Under Review': 'bg-blue-500',
    Approved: 'bg-green-500',
    Rejected: 'bg-red-500',
    Completed: 'bg-teal-500',
    'Requirements Needed': 'bg-orange-400',
  }

  return (
    <button
      onClick={onSelect}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-teal-200 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-mono text-gray-400 mb-0.5">{req.id}</p>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{req.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{req.type} · Submitted {req.dateSubmitted}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge(req.status)}
          <ChevronRight size={16} className="text-gray-300 group-hover:text-teal-500 transition-colors" />
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-medium text-gray-400">Progress</p>
          <p className="text-[11px] font-bold text-gray-600">{completedSteps}/{totalSteps} steps · {pct}%</p>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor[req.status] ?? 'bg-gray-300'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Mini timeline dots */}
      <div className="flex items-center gap-1.5 mt-3">
        {req.timeline.map((step, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-3 h-3 rounded-full border-2 transition-colors ${
                step.completed ? 'bg-teal-500 border-teal-500' :
                step.active ? 'bg-blue-500 border-blue-500' :
                'bg-white border-gray-300'
              }`}
              title={step.step}
            />
            <p className="text-[9px] text-gray-400 hidden sm:block text-center leading-tight" style={{ maxWidth: '50px' }}>
              {step.step.split(' ')[0]}
            </p>
          </div>
        ))}
      </div>
    </button>
  )
}

function TrackingDetail({ req, onClose }: { req: AssistanceRequest; onClose: () => void }) {
  return (
    <Modal open title={`Tracking — ${req.id}`} onClose={onClose} size="xl">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: info */}
        <div className="md:col-span-2 space-y-5">
          <div className="flex flex-wrap gap-2 items-center">
            {statusBadge(req.status)}
            <span className="text-xs text-gray-400">{req.type}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">Submitted {req.dateSubmitted}</span>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 text-base mb-1">{req.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{req.description}</p>
          </div>

          {/* Details grid */}
          <div className="bg-gray-50 rounded-xl p-4 grid sm:grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Request ID', value: req.id },
              { label: 'Assigned Staff', value: req.assignedStaff },
              { label: 'Date Submitted', value: req.dateSubmitted },
              { label: 'Last Updated', value: req.lastUpdated },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                <p className="font-medium text-gray-900 text-xs font-mono">{f.value}</p>
              </div>
            ))}
          </div>

          {/* Admin comments */}
          {req.comments.length > 0 ? (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">PDAO Staff Comments</p>
              {req.comments.map((c, i) => (
                <div key={i} className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-xs font-semibold text-teal-800">{c.author}</p>
                    <p className="text-xs text-teal-400">{c.date}</p>
                  </div>
                  <p className="text-sm text-teal-900 leading-relaxed">{c.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-400">No comments from PDAO staff yet.</p>
              <p className="text-xs text-gray-400 mt-0.5">You will be notified when a comment is added.</p>
            </div>
          )}
        </div>

        {/* Right: timeline */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Request Timeline</p>
          <Timeline steps={req.timeline} />
          {req.status === 'Approved' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-800 font-medium">
              ✓ Your request has been approved. Please visit the PDAO office to claim your assistance.
            </div>
          )}
          {req.status === 'Rejected' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 font-medium">
              Your request was not approved this time. See staff comments for details. You may reapply.
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default function RequestTracking() {
  const session = usePWDSession()
  const userId = session?.userId ?? (pwdUsers[0]?.id ?? '')
  const userRequests = assistanceRequests.filter((r) => r.pwdId === userId)
  const [selected, setSelected] = useState<AssistanceRequest | null>(null)
  const [filter, setFilter] = useState('All')

  const statusFilters = ['All', 'Pending', 'Under Review', 'Approved', 'Rejected', 'Completed']
  const filtered = filter === 'All' ? userRequests : userRequests.filter((r) => r.status === filter)

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request Tracking</h1>
        <p className="text-gray-500 text-sm mt-0.5">Monitor the status and progress of your assistance requests</p>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter requests by status">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
              filter === s
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-700'
            }`}
          >
            {s} {s === 'All' ? `(${userRequests.length})` : `(${userRequests.filter((r) => r.status === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="py-16 text-center">
          <ClipboardList size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No requests in this category</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <TrackingCard key={r.id} req={r} onSelect={() => setSelected(r)} />
          ))}
        </div>
      )}

      {selected && <TrackingDetail req={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
