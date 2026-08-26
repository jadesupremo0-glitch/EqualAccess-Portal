import { useState } from 'react'
import { Filter, Calendar, MapPin, Clock, Users, CheckCircle } from 'lucide-react'
import { type Benefit, type BenefitCategory } from '../../data'
import { Card, Button, SearchBar, statusBadge, Modal, Select } from '../../components/ui'
import { useStore } from '../../store'

const categories: BenefitCategory[] = [
  'Financial Assistance', 'Medical Assistance', 'Assistive Devices',
  'Educational Assistance', 'Livelihood Programs', 'Social Services',
  'Employment', 'Other Support Services',
]

function BenefitCard({ benefit, onView }: { benefit: Benefit; onView: () => void }) {
  const catColors: Record<string, string> = {
    'Financial Assistance': 'bg-green-50 text-green-700',
    'Medical Assistance': 'bg-red-50 text-red-700',
    'Assistive Devices': 'bg-blue-50 text-blue-700',
    'Educational Assistance': 'bg-purple-50 text-purple-700',
    'Livelihood Programs': 'bg-amber-50 text-amber-700',
    'Social Services': 'bg-cyan-50 text-cyan-700',
    'Employment': 'bg-indigo-50 text-indigo-700',
    'Other Support Services': 'bg-gray-50 text-gray-700',
  }

  return (
    <Card className="p-5 flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${catColors[benefit.category] ?? 'bg-gray-50 text-gray-600'}`}>
            {benefit.category}
          </span>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{benefit.name}</h3>
        </div>
        {statusBadge(benefit.status)}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed mb-4 flex-1 line-clamp-3">{benefit.description}</p>
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Users size={12} className="shrink-0 text-gray-400" />
          <span className="line-clamp-1">{benefit.eligibility}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin size={12} className="shrink-0 text-gray-400" />
          {benefit.barangay}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar size={12} className="shrink-0 text-gray-400" />
          Deadline: {benefit.applicationDeadline}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock size={12} className="shrink-0 text-gray-400" />
          {benefit.date} · {benefit.time}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onView} fullWidth>View Details</Button>
    </Card>
  )
}

function BenefitDetail({ benefit, onClose, onApply }: { benefit: Benefit; onClose: () => void; onApply: () => void }) {
  return (
    <Modal open title={benefit.name} onClose={onClose} size="lg">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{benefit.category}</span>
          {statusBadge(benefit.status)}
        </div>
        <p className="text-gray-700 text-sm leading-relaxed">{benefit.description}</p>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wide text-gray-500">Who Can Apply</p>
            <p className="text-gray-700">{benefit.eligibility}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wide text-gray-500">Location</p>
            <p className="text-gray-700 flex items-center gap-1"><MapPin size={14} className="text-gray-400" />{benefit.barangay}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wide text-gray-500">Schedule</p>
            <p className="text-gray-700">{benefit.date}</p>
            <p className="text-gray-500 text-xs">{benefit.time}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wide text-gray-500">Application Deadline</p>
            <p className="text-gray-700">{benefit.applicationDeadline}</p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Benefits Provided</p>
          <ul className="space-y-1">
            {benefit.benefits.map((b, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle size={14} className="text-green-600 shrink-0" />{b}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Required Documents</p>
          <ul className="space-y-1">
            {benefit.requirements.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 text-sm">
          <p className="font-semibold text-blue-900 mb-1">Contact Information</p>
          <p className="text-blue-700">{benefit.contactPerson}</p>
          <p className="text-blue-600">{benefit.contactNumber}</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button size="lg" onClick={onApply} fullWidth>Apply for This Program</Button>
          <Button size="lg" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Benefits({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { benefits, globalSearch, setGlobalSearch, setRequestDraft } = useStore()
  const [category, setCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Benefit | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const filtered = benefits.filter((b) => {
    // PWDs only see Approved and Active programs
    if (b.status !== 'Approved' && b.status !== 'Active') return false
    const q = globalSearch.toLowerCase()
    const matchSearch = !globalSearch || b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)
    const matchCat = !category || b.category === category
    const matchStatus = !statusFilter || b.status === statusFilter
    return matchSearch && matchCat && matchStatus
  })

  const handleApply = (benefit: Benefit) => {
    setRequestDraft({ type: benefit.category, title: benefit.name })
    onNavigate('pwd-requests')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Benefits & Programs</h1>
        <p className="text-gray-500 text-sm mt-0.5">Browse and apply for available PWD assistance programs</p>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-60">
          <SearchBar value={globalSearch} onChange={setGlobalSearch} placeholder="Search programs..." />
        </div>
        <Button variant="outline" icon={<Filter size={15} />} onClick={() => setShowFilters(!showFilters)}>
          Filters {showFilters ? '▲' : '▼'}
        </Button>
      </div>

      {showFilters && (
        <div className="flex gap-3 flex-wrap bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="min-w-48">
            <Select
              label="Category"
              options={categories.map((c) => ({ value: c, label: c }))}
              value={category}
              onChange={setCategory}
              placeholder="All Categories"
            />
          </div>
          <div className="min-w-36">
            <Select
              label="Status"
              options={[{ value: 'Active', label: 'Active' }, { value: 'Approved', label: 'Approved' }]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Statuses"
            />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => { setCategory(''); setStatusFilter(''); setGlobalSearch('') }}>Clear Filters</Button>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500">{filtered.length} program{filtered.length !== 1 ? 's' : ''} found</p>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-2">No programs found</p>
          <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => (
            <BenefitCard key={b.id} benefit={b} onView={() => setSelected(b)} />
          ))}
        </div>
      )}

      {selected && (
        <BenefitDetail
          benefit={selected}
          onClose={() => setSelected(null)}
          onApply={() => { setSelected(null); handleApply(selected) }}
        />
      )}
    </div>
  )
}
