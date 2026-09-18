import { useState } from 'react'
import { Plus, Eye } from 'lucide-react'
import { type AssistanceRequest } from '../../data'
import { Card, Button, statusBadge, Modal, Timeline, Alert, Textarea, Select, FileUpload, Input } from '../../components/ui'
import { usePWDSession } from '../../context'
import { useStore } from '../../store'

const assistanceTypes = [
  { value: 'Financial Assistance', label: 'Financial Assistance' },
  { value: 'Medical Assistance', label: 'Medical Assistance' },
  { value: 'Assistive Devices', label: 'Assistive Devices' },
  { value: 'Educational Assistance', label: 'Educational Assistance' },
  { value: 'Livelihood Training', label: 'Livelihood Training' },
  { value: 'Other Service Assistance', label: 'Other Service Assistance' },
]

const assistiveDeviceOptions = [
  { value: 'Wheelchair', label: 'Wheelchair' },
  { value: 'Hearing Aid', label: 'Hearing Aid' },
  { value: 'Prosthetic Limb', label: 'Prosthetic Limb' },
]

function RequestRow({ req, onView }: { req: AssistanceRequest; onView: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-mono text-gray-400">{req.id}</span>
          {statusBadge(req.status)}
        </div>
        <p className="text-sm font-semibold text-gray-900 truncate">{req.title}</p>
        <p className="text-xs text-gray-500">{req.type} · Submitted {req.dateSubmitted}</p>
      </div>
      <div className="text-xs text-gray-400 shrink-0">Updated: {req.lastUpdated}</div>
      <Button size="sm" variant="outline" icon={<Eye size={14} />} onClick={onView}>View</Button>
    </div>
  )
}

function RequestDetail({ req, onClose }: { req: AssistanceRequest; onClose: () => void }) {
  return (
    <Modal open title={`Request Details — ${req.id}`} onClose={onClose} size="xl">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Request Information</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Request ID:</span><span className="font-mono font-medium">{req.id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type:</span><span>{req.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status:</span>{statusBadge(req.status)}</div>
              <div className="flex justify-between"><span className="text-gray-500">Date Submitted:</span><span>{req.dateSubmitted}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Assigned To:</span><span>{req.assignedStaff}</span></div>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Description</p>
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4">{req.description}</p>
          </div>
          {req.comments.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Administrator Comments</p>
              <div className="space-y-3">
                {req.comments.map((c, i) => (
                  <div key={i} className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-semibold text-blue-800">{c.author}</p>
                      <p className="text-xs text-blue-500">{c.date}</p>
                    </div>
                    <p className="text-sm text-blue-900">{c.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-3">Request Timeline</p>
          <Timeline steps={req.timeline} />
        </div>
      </div>
    </Modal>
  )
}

function NewRequestForm({ onClose, onSaveDraft, onSubmit, initialType, initialTitle }: {
  onClose: () => void
  onSaveDraft: (draft: { type?: string; title?: string }) => void
  onSubmit: (data: { type: string; title: string; description: string; device?: string }) => void
  initialType?: string
  initialTitle?: string
}) {
  const [type, setType] = useState(initialType ?? '')
  const [title, setTitle] = useState(initialTitle ?? '')
  const [description, setDescription] = useState('')
  const [device, setDevice] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!type || !title || !description) {
      setError('Please complete the assistance type, title, and description.')
      return
    }
    if (type === 'Assistive Devices' && !device) {
      setError('Please select the assistive device you need.')
      return
    }
    setError('')
    onSubmit({ type, title, description, device: type === 'Assistive Devices' ? device : undefined })
  }

  return (
    <Modal open title="New Assistance Request" onClose={onClose} size="lg">
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}
        <Select label="Assistance Type" options={assistanceTypes} value={type} onChange={setType} placeholder="Select type of assistance" required />
        {type === 'Assistive Devices' && (
          <Select label="Type of Assistive Devices" options={assistiveDeviceOptions} value={device} onChange={setDevice} placeholder="Select assistive device" required />
        )}
        <Input label="Request Title" placeholder="Brief title for your request" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Textarea label="Description of Request" placeholder="Describe what you need assistance with..." value={description} onChange={setDescription} rows={4} required />
        <Textarea label="Reason for Request" placeholder="Explain why you need this assistance..." value={reason} onChange={setReason} rows={3} />
        <FileUpload label="Supporting Documents (Optional)" accept=".pdf,.jpg,.png" helperText="Medical certificates, ID, or other supporting documents" />
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSubmit} fullWidth>Submit Request</Button>
          <Button variant="outline" onClick={() => onSaveDraft({ type, title })} fullWidth>Save as Draft</Button>
        </div>
      </div>
    </Modal>
  )
}

function SubmittedModal({ req, onClose }: { req: AssistanceRequest; onClose: () => void }) {
  return (
    <Modal open title="Request Submitted" onClose={onClose} size="md">
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="text-green-600" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Request Submitted Successfully!</h3>
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-left space-y-2 mb-6">
          <div className="flex justify-between"><span className="text-gray-500">Reference No.:</span><span className="font-mono font-semibold">{req.id}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Date Submitted:</span><span>{req.dateSubmitted}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Type:</span><span>{req.type}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className="text-amber-600 font-medium">{req.status}</span></div>
        </div>
        <Alert type="info" message="Your request has been received. An administrator will review it within 3–5 business days." />
        <Button fullWidth className="mt-4" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

export default function Requests() {
  const session = usePWDSession()
  const { pwdUsers, assistanceRequests, addRequest, requestDraft, setRequestDraft } = useStore()
  const userId = session?.userId ?? (pwdUsers[0]?.id ?? '')
  const userRequests = assistanceRequests.filter((r) => r.pwdId === userId)
  const [selected, setSelected] = useState<AssistanceRequest | null>(null)
  const [newRequest, setNewRequest] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState<AssistanceRequest | null>(null)

  const openNewRequest = () => {
    setNewRequest(true)
  }

  const handleSubmitted = (data: { type: string; title: string; description: string; device?: string }) => {
    const description = data.device
      ? `${data.description}${data.description ? '\n\n' : ''}Assistive device needed: ${data.device}`
      : data.description
    const req = addRequest(userId, { type: data.type, title: data.title, description })
    setRequestDraft(null)
    setNewRequest(false)
    setJustSubmitted(req)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assistance Requests</h1>
          <p className="text-gray-500 text-sm mt-0.5">Submit and track your assistance requests</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openNewRequest}>New Request</Button>
      </div>

      {requestDraft?.type && (
        <div className="flex items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-900">You have a draft for <span className="font-semibold">{requestDraft.type}{requestDraft.title ? ` — ${requestDraft.title}` : ''}</span>.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setNewRequest(true)}>Continue Draft</Button>
            <Button size="sm" variant="ghost" onClick={() => setRequestDraft(null)}>Discard</Button>
          </div>
        </div>
      )}

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'All', count: userRequests.length, active: true },
          { label: 'Pending', count: userRequests.filter((r) => r.status === 'Pending').length, active: false },
          { label: 'Under Review', count: userRequests.filter((r) => r.status === 'Under Review').length, active: false },
          { label: 'Approved', count: userRequests.filter((r) => r.status === 'Approved').length, active: false },
          { label: 'Completed', count: userRequests.filter((r) => r.status === 'Completed').length, active: false },
        ].map((s) => (
          <div key={s.label} className={`text-center p-3 rounded-xl border ${s.active ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
            <p className={`text-2xl font-bold ${s.active ? 'text-blue-700' : 'text-gray-900'}`}>{s.count}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Request list */}
      <div className="space-y-3">
        {userRequests.length === 0 ? (
          <Card className="py-16 text-center">
            <p className="text-gray-400 mb-3">No assistance requests yet.</p>
            <Button onClick={openNewRequest} icon={<Plus size={16} />}>Submit Your First Request</Button>
          </Card>
        ) : (
          userRequests.map((r) => (
            <RequestRow key={r.id} req={r} onView={() => setSelected(r)} />
          ))
        )}
      </div>

      {selected && <RequestDetail req={selected} onClose={() => setSelected(null)} />}
      {newRequest && (
        <NewRequestForm
          onClose={() => setNewRequest(false)}
          onSaveDraft={(draft) => { setRequestDraft(draft); setNewRequest(false) }}
          onSubmit={handleSubmitted}
          initialType={requestDraft?.type}
          initialTitle={requestDraft?.title}
        />
      )}
      {justSubmitted && <SubmittedModal req={justSubmitted} onClose={() => setJustSubmitted(null)} />}
    </div>
  )
}
