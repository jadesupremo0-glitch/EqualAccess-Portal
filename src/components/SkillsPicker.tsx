import { useId, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { SKILL_SUGGESTIONS, canonicalOf } from '../lib/recommend/taxonomy'

const INITIAL_SUGGESTIONS = 14

/** Add skills by typing or tapping a suggestion. Suggestions use the matcher's own vocabulary. */
export default function SkillsPicker({ value, onChange, label = 'Skills', helperText }: {
  value: string[]
  onChange: (skills: string[]) => void
  label?: string
  helperText?: string
}) {
  const inputId = useId()
  const [draft, setDraft] = useState('')
  const [showAll, setShowAll] = useState(false)

  const has = (skill: string) => value.some((s) => canonicalOf(s) === canonicalOf(skill))
  const add = (raw: string) => {
    const additions = raw.split(/[,\n]/).map((s) => s.trim()).filter((s) => s && !has(s))
    if (additions.length > 0) onChange([...value, ...[...new Set(additions)]])
  }
  const commitDraft = () => {
    add(draft)
    setDraft('')
  }

  const suggestions = SKILL_SUGGESTIONS.filter((s) => !has(s))
  const shown = showAll ? suggestions : suggestions.slice(0, INITIAL_SUGGESTIONS)

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">{label}</label>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Your skills">
          {value.map((s) => (
            <li key={s} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-teal-50 text-teal-900 border border-teal-200 text-sm">
              {s}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== s))}
                aria-label={`Remove ${s}`}
                className="p-1 rounded-full hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ea-teal-500"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              commitDraft()
            }
          }}
          onBlur={commitDraft}
          placeholder="Type a skill and press Enter, e.g. Data Entry"
          className="flex-1 min-w-0 border border-white/70 shadow-sm rounded-xl text-sm text-slate-900 placeholder:text-slate-400 bg-white/70 px-3.5 py-2.5 focus:outline-none focus:ring-4 focus:ring-ea-teal-500/20 focus:border-ea-teal-400"
        />
        <button
          type="button"
          onClick={commitDraft}
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1 px-3.5 rounded-xl border border-teal-200 bg-white text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ea-teal-500"
        >
          <Plus size={14} aria-hidden="true" />Add
        </button>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="text-xs text-slate-600 mb-1.5">Or tap to add:</p>
          <ul className="flex flex-wrap gap-1.5">
            {shown.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => add(s)}
                  className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-white/80 text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ea-teal-500"
                >
                  + {s}
                </button>
              </li>
            ))}
          </ul>
          {suggestions.length > INITIAL_SUGGESTIONS && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 text-xs font-semibold text-teal-800 hover:underline">
              {showAll ? 'Show fewer' : `Show all ${suggestions.length} suggestions`}
            </button>
          )}
        </div>
      )}
      {helperText && <p className="text-xs text-slate-600">{helperText}</p>}
    </div>
  )
}
