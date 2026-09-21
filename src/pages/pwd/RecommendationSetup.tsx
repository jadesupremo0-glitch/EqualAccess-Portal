import { useState } from 'react'
import { CheckCircle, Sparkles } from 'lucide-react'
import { Card, Button, Input, Select } from '../../components/ui'
import SkillsPicker from '../../components/SkillsPicker'
import { useStore } from '../../store'
import { EDUCATION_LEVELS } from '../../lib/catalog'
import { applicantEducationRank } from '../../lib/recommend/education'
import type { PWDUser } from '../../data'

/**
 * The two things job recommendations are built from: what the PWD can do (skills) and how far they studied.
 * Shown before any job is listed, and again when they want to update either.
 */
export default function RecommendationSetup({ user, editing = false, onCancel, onSaved }: {
  user: PWDUser
  /** True when the PWD already has recommendations and is changing their answers. */
  editing?: boolean
  onCancel?: () => void
  onSaved?: () => void
}) {
  const { updateProfile } = useStore()
  const [skills, setSkills] = useState<string[]>(user.skills ?? [])
  const [educationLevel, setEducationLevel] = useState(
    user.educationLevel || (EDUCATION_LEVELS.find((l) => l.rank === applicantEducationRank(user))?.label ?? ''),
  )
  const [course, setCourse] = useState(user.education ?? '')

  const ready = skills.length > 0 && educationLevel !== ''

  const save = () => {
    if (!ready) return
    updateProfile(user.id, { skills, educationLevel, education: course.trim() })
    onSaved?.()
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 shrink-0" aria-hidden="true"><Sparkles size={20} /></div>
        <div>
          <h2 className="font-display text-lg font-bold text-gray-900">
            {editing ? 'Update your skills and education' : 'Tell us about your skills and education first'}
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            {editing
              ? 'Your recommendations refresh as soon as you save.'
              : 'Job recommendations are built from these two answers, so nothing is shown until you fill them in. It takes about a minute.'}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <SkillsPicker
          label="What skills do you have? *"
          value={skills}
          onChange={setSkills}
          helperText="Add everything you can do, even if you learned it outside school. More skills give more accurate matches."
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Highest education you finished"
            required
            options={EDUCATION_LEVELS.map((l) => ({ value: l.label, label: l.label }))}
            value={educationLevel}
            onChange={setEducationLevel}
            placeholder="Select your highest level"
          />
          <Input
            label="Course or degree (optional)"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="e.g. BS Information Technology"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={!ready} icon={<CheckCircle size={15} />}>
            <span className="ml-1.5">{editing ? 'Save and refresh' : 'Show my job recommendations'}</span>
          </Button>
          {editing && onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
          {!ready && (
            <p className="text-xs text-gray-600" role="status">
              {skills.length === 0 ? 'Add at least one skill' : 'Choose your highest education'} to continue.
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
