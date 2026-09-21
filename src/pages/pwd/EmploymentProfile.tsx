import { useState } from 'react'
import { Briefcase, Edit2, CheckCircle } from 'lucide-react'
import { Card, Button, Input, Select, Textarea, CheckboxGroup, Alert } from '../../components/ui'
import SkillsPicker from '../../components/SkillsPicker'
import { useStore } from '../../store'
import { ACCOMMODATIONS, EDUCATION_LEVELS, EMPLOYMENT_TYPES, WORK_ARRANGEMENTS } from '../../lib/catalog'
import { applicantEducationRank } from '../../lib/recommend/education'
import { profileGaps } from '../../lib/recommend/profile'
import type { PWDUser } from '../../data'

const splitList = (text: string) =>
  [...new Set(text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))]

const knownAccommodations = ACCOMMODATIONS as readonly string[]

function levelOf(user: PWDUser): string {
  if (user.educationLevel) return user.educationLevel
  const rank = applicantEducationRank(user)
  return EDUCATION_LEVELS.find((l) => l.rank === rank)?.label ?? ''
}

/** Skills, education, experience and job preferences that drive Job Recommendations. */
export default function EmploymentProfile({ user }: { user: PWDUser }) {
  const { updateProfile } = useStore()
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const initial = () => ({
    skills: [...(user.skills ?? [])] as string[],
    educationLevel: levelOf(user),
    education: user.education ?? '',
    workExperience: user.workExperience ?? '',
    jobTypes: [...(user.preferredJobTypes ?? [])] as string[],
    setups: [...(user.preferredWorkSetup ?? [])] as string[],
    accommodations: (user.accommodationRequirements ?? []).filter((a) => knownAccommodations.includes(a)),
    otherNeeds: (user.accommodationRequirements ?? []).filter((a) => !knownAccommodations.includes(a)).join(', '),
  })
  const [form, setForm] = useState(initial)
  const set = <K extends keyof ReturnType<typeof initial>>(k: K, v: ReturnType<typeof initial>[K]) => setForm((f) => ({ ...f, [k]: v }))

  const gaps = profileGaps(user)

  const save = () => {
    updateProfile(user.id, {
      skills: form.skills,
      educationLevel: form.educationLevel,
      education: form.education.trim(),
      workExperience: form.workExperience.trim(),
      preferredJobTypes: form.jobTypes as PWDUser['preferredJobTypes'],
      preferredWorkSetup: form.setups as PWDUser['preferredWorkSetup'],
      accommodationRequirements: [...form.accommodations, ...splitList(form.otherNeeds)],
    })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 4000)
  }

  const startEditing = () => {
    setForm(initial())
    setEditing(true)
  }

  const list = (items: string[] | undefined) => (items && items.length > 0 ? items.join(', ') : null)

  return (
    <Card>
      <div className="flex items-center justify-between gap-2 p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Briefcase size={18} className="text-blue-700" aria-hidden="true" />
          <h3 className="font-semibold text-gray-900">Employment Profile</h3>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" icon={<Edit2 size={14} />} onClick={startEditing}>Edit</Button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {saved && <Alert type="success" title="Employment profile saved" message="Your job recommendations were refreshed." />}
        {!editing && gaps.length > 0 && (
          <Alert type="info" title="Complete your profile for better job matches" message={`Still missing: ${gaps.map((g) => g.label.toLowerCase()).join(', ')}.`} />
        )}

        {editing ? (
          <div className="space-y-5">
            <SkillsPicker value={form.skills} onChange={(v) => set('skills', v)} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="Highest education level"
                options={EDUCATION_LEVELS.map((l) => ({ value: l.label, label: l.label }))}
                value={form.educationLevel}
                onChange={(v) => set('educationLevel', v)}
                placeholder="Select your highest level"
              />
              <Input label="Course or degree (optional)" value={form.education} onChange={(e) => set('education', e.target.value)} placeholder="e.g. BS Information Technology" />
            </div>
            <Textarea
              label="Work experience"
              rows={2}
              value={form.workExperience}
              onChange={(v) => set('workExperience', v)}
              placeholder="A short summary, e.g. 2 years as a barangay records assistant"
            />
            <div className="grid sm:grid-cols-2 gap-5">
              <CheckboxGroup legend="Preferred employment type" options={EMPLOYMENT_TYPES} value={form.jobTypes} onChange={(v) => set('jobTypes', v)} columns={1} />
              <CheckboxGroup legend="Preferred work arrangement" options={WORK_ARRANGEMENTS} value={form.setups} onChange={(v) => set('setups', v)} columns={1} />
            </div>
            <div className="rounded-xl border border-ea-teal-100 bg-ea-teal-50/50 p-4 space-y-3">
              <CheckboxGroup
                legend="Accommodation needs (optional)"
                options={ACCOMMODATIONS}
                value={form.accommodations}
                onChange={(v) => set('accommodations', v)}
                helperText="Only used to find jobs that can support you. Leave blank if you prefer not to say."
              />
              <Input label="Other needs (optional)" value={form.otherNeeds} onChange={(e) => set('otherNeeds', e.target.value)} placeholder="Separate with commas" />
            </div>
            <div className="flex gap-3">
              <Button onClick={save} icon={<CheckCircle size={15} />}>Save Employment Profile</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Skills', value: list(user.skills), wide: true },
              { label: 'Highest education level', value: levelOf(user) || null },
              { label: 'Course or degree', value: user.education || null },
              { label: 'Work experience', value: user.workExperience || null, wide: true },
              { label: 'Preferred employment type', value: list(user.preferredJobTypes) },
              { label: 'Preferred work arrangement', value: list(user.preferredWorkSetup) },
              { label: 'Accommodation needs', value: list(user.accommodationRequirements), wide: true },
            ].map((f) => (
              <div key={f.label} className={f.wide ? 'sm:col-span-2' : ''}>
                <dt className="text-xs font-medium text-gray-600 mb-0.5">{f.label}</dt>
                <dd className={f.value ? 'text-gray-900' : 'text-gray-600 italic'}>{f.value ?? 'Not set'}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Card>
  )
}
