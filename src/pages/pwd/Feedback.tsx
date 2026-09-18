import { useState } from 'react'
import { MessageSquare, Send, Eye, Lock } from 'lucide-react'
import { type FeedbackTicket } from '../../data'
import { Card, Button, Input, Textarea, Select, statusBadge, Modal, FileUpload, Alert } from '../../components/ui'
import { usePWDSession } from '../../context'
import { useStore } from '../../store'

const categories = [
  { value: 'Question', label: 'Ask a Question' },
  { value: 'Complaint', label: 'File a Complaint' },
  { value: 'Report', label: 'Report a Concern' },
  { value: 'Feedback', label: 'Submit Feedback' },
]

function TicketCard({ ticket, onView }: { ticket: FeedbackTicket; onView: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-mono text-gray-400">{ticket.id}</span>
          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ticket.category}</span>
          {statusBadge(ticket.status)}
        </div>
        <p className="text-sm font-semibold text-gray-900 truncate">{ticket.subject}</p>
        <p className="text-xs text-gray-500">Submitted {ticket.dateSubmitted} · Last response: {ticket.responses[ticket.responses.length - 1]?.date ?? 'No response yet'}</p>
      </div>
      <Button size="sm" variant="outline" icon={<Eye size={14} />} onClick={onView}>View Thread</Button>
    </div>
  )
}

function TicketDetail({ ticket, onClose }: { ticket: FeedbackTicket; onClose: () => void }) {
  const { addFeedbackReply } = useStore()
  const [reply, setReply] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <Modal open title={ticket.subject} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-mono text-gray-400">{ticket.id}</span>
          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ticket.category}</span>
          {statusBadge(ticket.status)}
        </div>
        {/* Original message */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold text-gray-600">{ticket.isAnonymous ? 'Anonymous User' : ticket.pwdName} (You)</p>
            <p className="text-xs text-gray-400">{ticket.dateSubmitted}</p>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{ticket.message}</p>
        </div>
        {/* Responses */}
        {ticket.responses.filter((r) => !r.isInternal).map((r, i) => (
          <div key={i} className="bg-blue-50 rounded-xl p-4 border border-blue-100 ml-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-blue-800">{r.author} (Admin)</p>
              <p className="text-xs text-blue-400">{r.date}</p>
            </div>
            <p className="text-sm text-blue-900 leading-relaxed">{r.message}</p>
          </div>
        ))}
        {/* Reply input */}
        {ticket.status !== 'Closed' && (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            {sent && <Alert type="success" message="Reply sent successfully." />}
            <Textarea label="Your Reply" value={reply} onChange={setReply} placeholder="Type your reply here..." rows={3} />
            <Button
              icon={<Send size={15} />}
              disabled={!reply.trim()}
              onClick={() => { addFeedbackReply(ticket.id, 'You', reply); setReply(''); setSent(true); setTimeout(() => setSent(false), 2500) }}
            >
              Send Reply
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function FeedbackPage() {
  const session = usePWDSession()
  const { pwdUsers, feedbackTickets, submitFeedback } = useStore()
  const me = session ? (pwdUsers.find((u) => u.id === session.userId) ?? pwdUsers[0]) : pwdUsers[0]

  const [view, setView] = useState<'form' | 'list'>('form')
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selected, setSelected] = useState<FeedbackTicket | null>(null)

  const myTickets = feedbackTickets.filter((t) => t.userId === me.id || (!t.userId && t.pwdName === me.name))

  const handleSubmit = () => {
    if (!category || !subject || !message) return
    submitFeedback(me.id, { category, subject, message, anonymous })
    setSubmitted(true)
    setCategory(''); setSubject(''); setMessage(''); setAnonymous(false)
    setTimeout(() => { setSubmitted(false); setView('list') }, 1500)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feedback & Support</h1>
        <p className="text-gray-500 text-sm mt-0.5">Ask questions, report concerns, or send feedback to our team</p>
      </div>

      {/* Toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setView('form')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${view === 'form' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Submit a Message
        </button>
        <button onClick={() => setView('list')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${view === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          My Conversations ({myTickets.length})
        </button>
      </div>

      {view === 'form' && (
        <Card className="p-6 space-y-4">
          {submitted && <Alert type="success" title="Message Sent" message="Your message has been submitted. We will respond within 2 business days." />}
          <Select label="Message Type" options={categories} value={category} onChange={setCategory} placeholder="Select type of message" required />
          <Input label="Subject" placeholder="Brief description of your concern" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          <Textarea label="Message" placeholder="Provide details about your concern or question..." value={message} onChange={setMessage} rows={5} required />
          <FileUpload label="Attach File (Optional)" helperText="JPG, PNG, PDF · Max 5 MB" />
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="anon"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="mt-0.5 w-4 h-4 border-gray-300 rounded text-blue-700 focus:ring-blue-500"
            />
            <label htmlFor="anon" className="text-sm text-gray-600 cursor-pointer flex items-center gap-1.5">
              <Lock size={13} className="text-gray-400" />
              Submit anonymously — your name will not be shown to administrators
            </label>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSubmit} icon={<Send size={15} />} disabled={!category || !subject || !message}>
              Submit Message
            </Button>
            <Button variant="outline" onClick={() => { setCategory(''); setSubject(''); setMessage('') }}>Clear</Button>
          </div>
        </Card>
      )}

      {view === 'list' && (
        <div className="space-y-3">
          {myTickets.length === 0 ? (
            <Card className="py-12 text-center">
              <MessageSquare size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">No conversations yet.</p>
              <Button className="mt-3" variant="outline" onClick={() => setView('form')}>Start a Conversation</Button>
            </Card>
          ) : (
            myTickets.map((t) => <TicketCard key={t.id} ticket={t} onView={() => setSelected(t)} />)
          )}
        </div>
      )}

      {selected && (
        <TicketDetail ticket={feedbackTickets.find((t) => t.id === selected.id) ?? selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
