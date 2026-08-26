import { useState } from 'react'
import { Plus, Eye, Edit2, Trash2, Power } from 'lucide-react'
import { type BenefitStatus } from '../../data'
import { Card, Button, SearchBar, Select, statusBadge, Modal, Input, Textarea } from '../../components/ui'
import { useStore, type BenefitInput } from '../../store'

function AddProgramModal({ onClose }: { onClose: () => void }) {
  const { addBenefit } = useStore()
  const [form, setForm] = useState({ name: '', description: '', eligibility: '', barangay: '', date: '', time: '', deadline: '', status: 'Draft' as BenefitStatus })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const programStatuses: BenefitStatus[] = ['Draft', 'Pending Approval', 'Approved', 'Active', 'Closed']
  const barangays = ['All Barangays', 'Anos', 'Bagong Silang', 'Bambang', 'Batong Malake', 'Baybayin', 'Bayog', 'Lalakay', 'Maahas', 'Malinta', 'Mayondon', 'Putho-Tuntungin', 'San Antonio', 'Tadlac', 'Timugan']

  const handleSave = () => {
    if (!form.name) return
    const input: BenefitInput = {
      name: form.name,
      category: 'Other Support Services',
      description: form.description,
      eligibility: form.eligibility,
      barangay: form.barangay,
      date: form.date,
      time: form.time,
      deadline: form.deadline,
      status: form.status as BenefitStatus,
      requirements: [],
      benefits: [],
      contactPerson: '',
      contactNumber: '',
    }
    addBenefit(input)
    onClose()
  }

  return (
    <Modal open title="Add New Program" onClose={onClose} size="xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Program Name" placeholder="e.g., Monthly Cash Assistance" value={form.name} onChange={(e) => set('name', e.target.value)} className="sm:col-span-2" required />
        <Select label="Barangay" options={barangays.map((b) => ({ value: b, label: b }))} value={form.barangay} onChange={(v) => set('barangay', v)} placeholder="Select barangay" />
        <Select label="Program Status" options={programStatuses.map((s) => ({ value: s, label: s }))} value={form.status} onChange={(v) => set('status', v)} />
        <div className="sm:col-span-2">
          <Textarea label="Description" value={form.description} onChange={(v) => set('description', v)} placeholder="Describe the program..." rows={3} />
        </div>
        <Textarea label="Eligibility Requirements" value={form.eligibility} onChange={(v) => set('eligibility', v)} placeholder="Who can apply..." rows={3} />
        <Textarea label="Benefits Provided" value="" onChange={() => {}} placeholder="List the benefits..." rows={3} />
        <Input label="Date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        <Input label="Time" value={form.time} placeholder="e.g., 8:00 AM – 5:00 PM" onChange={(e) => set('time', e.target.value)} />
        <Input label="Application Deadline" type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
      </div>
      <div className="flex gap-3 mt-5">
        <Button onClick={handleSave} fullWidth>Save Program</Button>
        <Button variant="outline" onClick={onClose} fullWidth>Cancel</Button>
      </div>
    </Modal>
  )
}

export default function BenefitsManagement() {
  const { benefits, toggleBenefitStatus, deleteBenefit } = useStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)

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
          <Select label="" options={[
            { value: 'Draft', label: 'Draft' },
            { value: 'Pending Approval', label: 'Pending Approval' },
            { value: 'Approved', label: 'Approved' },
            { value: 'Active', label: 'Active' },
            { value: 'Closed', label: 'Closed' },
          ]} value={statusFilter} onChange={setStatusFilter} placeholder="All Statuses" />
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
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" aria-label={`View ${b.name}`}><Eye size={14} /></button>
                      <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" aria-label={`Edit ${b.name}`}><Edit2 size={14} /></button>
                      <button className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg" aria-label={`Toggle ${b.name} status`} onClick={() => toggleBenefitStatus(b.id)}><Power size={14} /></button>
                      <button className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" aria-label={`Delete ${b.name}`} onClick={() => deleteBenefit(b.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && <AddProgramModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
