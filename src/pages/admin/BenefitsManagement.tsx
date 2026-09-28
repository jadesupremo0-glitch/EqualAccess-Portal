import { useState } from 'react'
import { Plus, Eye, Edit2, Trash2, Power } from 'lucide-react'
import { type Benefit, type BenefitCategory, type BenefitStatus } from '../../data'
import { Card, Button, SearchBar, Select, statusBadge, Modal, Input, Textarea, Alert } from '../../components/ui'
import { useStore, type BenefitInput } from '../../store'
import { ALL_BARANGAYS_LABEL, BARANGAYS, barangayLabel } from '../../lib/catalog'

const PROGRAM_STATUSES: BenefitStatus[] = ['Draft', 'Pending Approval', 'Approved', 'Active', 'Closed']
const PROGRAM_CATEGORIES: BenefitCategory[] = [
  'Financial Assistance', 'Medical Assistance', 'Assistive Devices', 'Educational Assistance',
  'Livelihood Programs', 'Social Services', 'Employment', 'Other Support Services',
]
const BARANGAY_CHOICES = [ALL_BARANGAYS_LABEL, ...BARANGAYS.map(barangayLabel)]

/** One entry per non-empty line. */
const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean)

/** Add a program, or edit `benefit` when given. */
function ProgramModal({ benefit, onClose }: { benefit?: Benefit; onClose: () => void }) {
  const { addBenefit, updateBenefit } = useStore()
  const [form, setForm] = useState({
    name: benefit?.name ?? '',
    category: benefit?.category ?? ('' as BenefitCategory | ''),
    description: benefit?.description ?? '',
    eligibility: benefit?.eligibility ?? '',
    barangay: benefit?.barangay ?? '',
    date: benefit?.date ?? '',
    time: benefit?.time ?? '',
    deadline: benefit?.applicationDeadline ?? '',
    status: benefit?.status ?? ('Draft' as BenefitStatus),
    benefits: (benefit?.benefits ?? []).join('\n'),
    requirements: (benefit?.requirements ?? []).join('\n'),
    contactPerson: benefit?.contactPerson ?? '',
    contactNumber: benefit?.contactNumber ?? '',
  })
  const [error, setError] = useState('')
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim() || !form.category) {
      setError('Program name and category are required.')
      return
    }
    const input: BenefitInput = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      eligibility: form.eligibility.trim(),
      barangay: form.barangay,
      date: form.date,
      time: form.time.trim(),
      deadline: form.deadline,
      status: form.status,
      requirements: lines(form.requirements),
      benefits: lines(form.benefits),
      contactPerson: form.contactPerson.trim(),
      contactNumber: form.contactNumber.trim(),
    }
    if (benefit) {
      const { deadline, ...rest } = input
      updateBenefit(benefit.id, { ...rest, applicationDeadline: deadline })
    } else {
      addBenefit(input)
    }
    onClose()
  }

  return (
    <Modal open title={benefit ? `Edit Program — ${benefit.id}` : 'Add New Program'} onClose={onClose} size="xl">
      {error && <div className="mb-4"><Alert type="error" message={error} /></div>}
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Program Name" placeholder="e.g., Monthly Cash Assistance" value={form.name} onChange={(e) => set('name', e.target.value)} className="sm:col-span-2" required />
        <Select label="Category" options={PROGRAM_CATEGORIES.map((c) => ({ value: c, label: c }))} value={form.category} onChange={(v) => set('category', v)} placeholder="Select category" required />
        <Select label="Program Status" options={PROGRAM_STATUSES.map((s) => ({ value: s, label: s }))} value={form.status} onChange={(v) => set('status', v)} />
        <Select label="Barangay" options={BARANGAY_CHOICES.map((b) => ({ value: b, label: b }))} value={form.barangay} onChange={(v) => set('barangay', v)} placeholder="Select barangay" />
        <Input label="Application Deadline" type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
        <div className="sm:col-span-2">
          <Textarea label="Description" value={form.description} onChange={(v) => set('description', v)} placeholder="Describe the program..." rows={3} />
        </div>
        <Textarea label="Eligibility Requirements" value={form.eligibility} onChange={(v) => set('eligibility', v)} placeholder="Who can apply..." rows={3} />
        <Textarea label="Benefits Provided" value={form.benefits} onChange={(v) => set('benefits', v)} placeholder="One benefit per line" rows={3} />
        <Textarea label="Required Documents" value={form.requirements} onChange={(v) => set('requirements', v)} placeholder="One document per line" rows={3} />
        <div className="grid gap-4">
          <Input label="Date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          <Input label="Time" value={form.time} placeholder="e.g., 8:00 AM – 5:00 PM" onChange={(e) => set('time', e.target.value)} />
        </div>
        <Input label="Contact Person" value={form.contactPerson} placeholder="Defaults to PDAO Office" onChange={(e) => set('contactPerson', e.target.value)} />
        <Input label="Contact Number" value={form.contactNumber} placeholder="Defaults to the PDAO hotline" onChange={(e) => set('contactNumber', e.target.value)} />
      </div>
      <div className="flex gap-3 mt-5">
        <Button onClick={handleSave} fullWidth>{benefit ? 'Save Changes' : 'Save Program'}</Button>
        <Button variant="outline" onClick={onClose} fullWidth>Cancel</Button>
      </div>
    </Modal>
  )
}

function ProgramDetail({ benefit, onClose, onEdit }: { benefit: Benefit; onClose: () => void; onEdit: () => void }) {
  const list = (items: string[]) =>
    items.length > 0 ? <ul className="list-disc pl-5 space-y-0.5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="text-gray-400">None listed</p>
  return (
    <Modal open title={benefit.name} onClose={onClose} size="lg">
      <div className="space-y-4 text-sm text-gray-700">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-mono text-gray-400">{benefit.id}</span>
          <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{benefit.category}</span>
          {statusBadge(benefit.status)}
        </div>
        {benefit.description && <p className="leading-relaxed">{benefit.description}</p>}
        <div className="grid sm:grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
          {[
            { label: 'Who Can Apply', value: benefit.eligibility },
            { label: 'Barangay', value: benefit.barangay },
            { label: 'Schedule', value: [benefit.date, benefit.time].filter(Boolean).join(' · ') },
            { label: 'Application Deadline', value: benefit.applicationDeadline },
            { label: 'Contact', value: [benefit.contactPerson, benefit.contactNumber].filter(Boolean).join(' · ') },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium text-gray-500 mb-0.5">{f.label}</p>
              <p className="text-gray-900">{f.value || '—'}</p>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-1">Benefits Provided</p>{list(benefit.benefits)}</div>
          <div><p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-1">Required Documents</p>{list(benefit.requirements)}</div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button icon={<Edit2 size={14} />} onClick={onEdit}>Edit Program</Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function BenefitsManagement() {
  const { benefits, toggleBenefitStatus, deleteBenefit } = useStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const viewing = benefits.find((b) => b.id === viewingId)
  const editing = benefits.find((b) => b.id === editingId)
  const deleting = benefits.find((b) => b.id === deletingId)

  const filtered = benefits.filter((b) => {
    const q = search.toLowerCase()
    return (!search || b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q))
      && (!statusFilter || b.status === statusFilter)
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Benefits & Programs</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage assistance programs and services</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>Add New Program</Button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex-1 min-w-52">
          <SearchBar value={search} onChange={setSearch} placeholder="Search programs..." />
        </div>
        <div className="min-w-36">
          <Select label="" ariaLabel="Filter by status" options={PROGRAM_STATUSES.map((s) => ({ value: s, label: s }))} value={statusFilter} onChange={setStatusFilter} placeholder="All Statuses" />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Benefits and programs table">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                {['Program Name', 'Barangay', 'Date', 'Deadline', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 max-w-xs">{b.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{b.description}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{b.barangay}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{b.date}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{b.applicationDeadline}</td>
                  <td className="px-4 py-3">{statusBadge(b.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" aria-label={`View ${b.name}`} onClick={() => setViewingId(b.id)}><Eye size={14} /></button>
                      <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" aria-label={`Edit ${b.name}`} onClick={() => setEditingId(b.id)}><Edit2 size={14} /></button>
                      <button className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg" aria-label={`${b.status === 'Active' ? 'Close' : 'Activate'} ${b.name}`} title={b.status === 'Active' ? 'Close program' : 'Activate program'} onClick={() => toggleBenefitStatus(b.id)}><Power size={14} /></button>
                      <button className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" aria-label={`Delete ${b.name}`} onClick={() => setDeletingId(b.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No programs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && <ProgramModal onClose={() => setShowAdd(false)} />}
      {editing && <ProgramModal benefit={editing} onClose={() => setEditingId(null)} />}
      {viewing && <ProgramDetail benefit={viewing} onClose={() => setViewingId(null)} onEdit={() => { setViewingId(null); setEditingId(viewing.id) }} />}
      {deleting && (
        <Modal open title="Delete program?" onClose={() => setDeletingId(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>{deleting.name}</strong> will be removed and PWDs will no longer see it. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="danger" className="flex-1" onClick={() => { deleteBenefit(deleting.id); setDeletingId(null) }}>Delete Program</Button>
              <Button variant="outline" className="flex-1" onClick={() => setDeletingId(null)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
