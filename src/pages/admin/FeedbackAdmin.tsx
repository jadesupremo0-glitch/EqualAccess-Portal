import { useState } from 'react'
import { Eye, Send } from 'lucide-react'
import { type FeedbackTicket } from '../../data'
import { Card, Tabs, statusBadge, Modal, Button, Textarea, Alert } from '../../components/ui'
import { useStore } from '../../store'

const ALL_TABS = ['All', 'Questions', 'Complaints', 'Reports', 'Feedback']

function TicketDetailModal({ ticket, onClose }: { ticket: FeedbackTicket; onClose: () => void }) {
  const { addFeedbackResponse, setFeedbackStatus } = useStore()
  const [reply, setReply] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [ack, setAck] = useState('')

  return (
    <Modal open title={`Ticket — ${ticket.id}`} onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-mono text-gray-400">{ticket.id}</span>
          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{ticket.category}</span>
          {statusBadge(ticket.status)}
          {ticket.isAnonymous && (
            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              🔒 Anonymous
            </span>
          )}
        </div>

        {/* Submitter info */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm">
          <p className="text-xs text-gray-500 mb-1">Submitted by</p>
          <p className="font-medium text-gray-900">{ticket.isAnonymous ? 'Anonymous User' : ticket.pwdName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{ticket.dateSubmitted}</p>
        </div>

        {/* Original message */}
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Message</p>
          <p className="text-sm text-gray-800 bg-gray-50 rounded-xl p-4 leading-relaxed">{ticket.message}</p>
        </div>

        {/* Conversation thread */}
        {ticket.responses.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Conversation Thread</p>
            <div className="space-y-3">
              {ticket.responses.map((r, i) => (
                <div key={i} className={`rounded-xl p-4 border text-sm ${r.isInternal ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-100 ml-4'}`}>
                  <div className="flex justify-between mb-1">
                    <p className={`text-xs font-semibold ${r.isInternal ? 'text-yellow-800' : 'text-blue-800'}`}>
                      {r.author} {r.isInternal ? '(Internal Note)' : '(Admin Reply)'}
                    </p>
                    <p className="text-xs text-gray-400">{r.date}</p>
                  </div>
                  <p className={r.isInternal ? 'text-yellow-900' : 'text-blue-900'}>{r.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {ack && <Alert type="success" message={ack} />}

        {/* Reply area */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <Textarea label="Reply to User" value={reply} onChange={setReply} placeholder="Type your reply to the user..." rows={3} />
          <Textarea label="Internal Note (not visible to user)" value={internalNote} onChange={setInternalNote} placeholder="Add an internal note for the team..." rows={2} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<Send size={14} />} disabled={!reply.trim()} onClick={() => { addFeedbackResponse(ticket.id, { author: 'PDAO Staff', message: reply.trim() }); setReply(''); setAck('Reply sent successfully.') }}>
              Send Reply
            </Button>
            <Button size="sm" variant="secondary" disabled={!internalNote.trim()} onClick={() => { addFeedbackResponse(ticket.id, { author: 'PDAO Staff', message: internalNote.trim(), isInternal: true }); setInternalNote(''); setAck('Internal note added.') }}>
              Add Internal Note
            </Button>
          </div>
        </div>

        {/* Status actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          <Button size="sm" variant="outline" disabled={ticket.status === 'In Progress'} onClick={() => { setFeedbackStatus(ticket.id, 'In Progress'); setAck('Status updated to In Progress.') }}>Mark In Progress</Button>
          <Button size="sm" variant="outline" disabled={ticket.status === 'Resolved'} onClick={() => { setFeedbackStatus(ticket.id, 'Resolved'); setAck('Status updated to Resolved.') }}>Mark Resolved</Button>
          <Button size="sm" variant="outline" disabled={ticket.status === 'Closed'} onClick={() => { setFeedbackStatus(ticket.id, 'Closed'); setAck('Ticket closed.') }}>Close Ticket</Button>
          <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">Close</Button>
        </div>
      </div>
    </Modal>
  )
}

const TAB_CATEGORY: Record<string, FeedbackTicket['category']> = {
  Questions: 'Question',
  Complaints: 'Complaint',
  Reports: 'Report',
  Feedback: 'Feedback',
}

export default function FeedbackAdmin() {
  const { feedbackTickets } = useStore()
  const [tab, setTab] = useState('All')
  const [selected, setSelected] = useState<FeedbackTicket | null>(null)

  const filtered = feedbackTickets.filter((t) => tab === 'All' || t.category === TAB_CATEGORY[tab])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feedback & Support</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage support tickets and user concerns</p>
      </div>

      <Tabs tabs={ALL_TABS} active={tab} onChange={setTab} />

      <p className="text-sm text-gray-500">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</p>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Feedback tickets table">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                {['Ticket ID', 'Submitted By', 'Subject', 'Category', 'Date', 'Status', 'Assigned Staff', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {t.isAnonymous && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Anon</span>}
                      <span className="text-gray-900 font-medium whitespace-nowrap">{t.isAnonymous ? 'Anonymous User' : t.pwdName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{t.subject}</td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{t.category}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{t.dateSubmitted}</td>
                  <td className="px-4 py-3">{statusBadge(t.status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{t.assignedStaff}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" aria-label={`Open ticket ${t.id}`}>
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No tickets found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <TicketDetailModal ticket={feedbackTickets.find((t) => t.id === selected.id) ?? selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
