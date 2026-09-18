import { useState, useId, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react'
import { CheckCircle, Clock, XCircle, AlertCircle, Eye, EyeOff, X } from 'lucide-react'

// --- Badge ---
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'blue'

const badgeStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50/90 text-emerald-700 ring-1 ring-inset ring-emerald-200/80',
  warning: 'bg-amber-50/90 text-amber-700 ring-1 ring-inset ring-amber-200/80',
  error: 'bg-rose-50/90 text-rose-700 ring-1 ring-inset ring-rose-200/80',
  info: 'bg-sky-50/90 text-sky-700 ring-1 ring-inset ring-sky-200/80',
  neutral: 'bg-slate-100/90 text-slate-600 ring-1 ring-inset ring-slate-200/80',
  blue: 'bg-gradient-to-r from-ea-teal-600 to-ea-blue-700 text-white shadow-sm shadow-ea-blue-700/25',
}

const badgeIcons: Partial<Record<BadgeVariant, ReactNode>> = {
  success: <CheckCircle size={12} />,
  warning: <Clock size={12} />,
  error: <XCircle size={12} />,
  info: <AlertCircle size={12} />,
}

export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeStyles[variant]}`}>
      {badgeIcons[variant]}
      {children}
    </span>
  )
}

export function statusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    Verified: 'success',
    Approved: 'success',
    Completed: 'success',
    Active: 'success',
    Resolved: 'success',
    Available: 'success',
    Claimed: 'info',
    Closed: 'neutral',
    Draft: 'neutral',
    Pending: 'warning',
    'Pending Approval': 'warning',
    'Under Review': 'info',
    'In Progress': 'info',
    Open: 'info',
    Upcoming: 'blue',
    Rejected: 'error',
    Unverified: 'neutral',
    Inactive: 'neutral',
    'Requirements Needed': 'warning',
  }
  return <Badge variant={map[status] ?? 'neutral'}>{status}</Badge>
}

// --- Button ---
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const btnVariants: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-ea-teal-600 to-ea-blue-600 text-white shadow-lg shadow-ea-teal-600/25 hover:from-ea-teal-500 hover:to-ea-blue-500 hover:shadow-xl hover:shadow-ea-blue-600/25 active:scale-[0.98]',
  secondary: 'bg-ea-teal-50 text-ea-teal-700 hover:bg-ea-teal-100 active:scale-[0.98]',
  outline: 'border border-white/70 bg-white/60 text-slate-700 shadow-sm backdrop-blur hover:bg-white hover:border-ea-teal-300 hover:text-ea-teal-700 active:scale-[0.98]',
  ghost: 'text-slate-600 hover:bg-white/70 hover:text-slate-900 active:scale-[0.98]',
  danger: 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/25 hover:from-rose-500 hover:to-red-500 active:scale-[0.98]',
}

const btnSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-lg',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3 text-base gap-2 rounded-xl',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  fullWidth?: boolean
}

export function Button({ variant = 'primary', size = 'md', icon, fullWidth, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${btnVariants[variant]} ${btnSizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}

// --- Card ---
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`card-glass rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between p-6 pb-2">
      <div>
        <h3 className="font-display text-base font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  )
}

// --- PageHeader (new) ---
export function PageHeader({ title, subtitle, actions, gradient = false }: {
  title: string
  subtitle?: string
  actions?: ReactNode
  gradient?: boolean
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 animate-fade-up">
      <div>
        <h1 className={`font-display text-2xl font-extrabold tracking-tight text-slate-900 ${gradient ? 'text-gradient' : ''}`}>{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

// --- Input ---
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: ReactNode
}

export function Input({ label, error, helperText, icon, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        <input
          id={inputId}
          className={`w-full border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 bg-white/70 backdrop-blur transition-all focus:outline-none focus:ring-4 focus:ring-ea-teal-500/20 focus:border-ea-teal-400 disabled:bg-slate-100/70 disabled:text-slate-500 ${error ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400' : 'border-white/70 shadow-sm'} ${icon ? 'pl-10' : 'pl-3.5'} pr-3.5 py-2.5 ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  )
}

// --- PasswordInput ---
export function PasswordInput({ label, error, ...props }: Omit<InputProps, 'type' | 'icon'>) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={`w-full border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 bg-white/70 backdrop-blur transition-all focus:outline-none focus:ring-4 focus:ring-ea-teal-500/20 focus:border-ea-teal-400 pl-3.5 pr-10 py-2.5 ${error ? 'border-red-400' : 'border-white/70 shadow-sm'}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
    </div>
  )
}

// --- Select ---
interface SelectProps {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}

export function Select({ label, error, options, value, onChange, placeholder, required }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-xl text-sm text-slate-900 bg-white/70 backdrop-blur transition-all focus:outline-none focus:ring-4 focus:ring-ea-teal-500/20 focus:border-ea-teal-400 pl-3.5 pr-3.5 py-2.5 ${error ? 'border-red-400' : 'border-white/70 shadow-sm'}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
    </div>
  )
}

// --- Textarea ---
interface TextareaProps {
  label?: string
  error?: string
  helperText?: string
  rows?: number
  placeholder?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}

export function Textarea({ label, error, helperText, rows = 4, placeholder, value, onChange, required }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 bg-white/70 backdrop-blur transition-all focus:outline-none focus:ring-4 focus:ring-ea-teal-500/20 focus:border-ea-teal-400 px-3.5 py-2.5 resize-none ${error ? 'border-red-400' : 'border-white/70 shadow-sm'}`}
      />
      {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  )
}

// --- Modal ---
export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  if (!open) return null
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <div className={`relative glass-strong rounded-2xl shadow-2xl shadow-slate-900/20 w-full ${widths[size]} max-h-[90vh] overflow-y-auto animate-scale-in`}>
        <div className="relative h-1.5 rounded-t-2xl bg-gradient-to-r from-ea-teal-500 via-sky-500 to-ea-blue-600" aria-hidden="true" />
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-white transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 pt-2">{children}</div>
      </div>
    </div>
  )
}

// --- Alert ---
export function Alert({ type, title, message }: { type: 'success' | 'warning' | 'error' | 'info'; title?: string; message: string }) {
  const styles = {
    success: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900',
    warning: 'bg-amber-50/80 border-amber-200/80 text-amber-900',
    error: 'bg-rose-50/80 border-rose-200/80 text-rose-900',
    info: 'bg-sky-50/80 border-sky-200/80 text-sky-900',
  }
  const accents = {
    success: 'from-emerald-500 to-teal-500',
    warning: 'from-amber-500 to-orange-500',
    error: 'from-rose-500 to-red-500',
    info: 'from-sky-500 to-ea-blue-600',
  }
  const icons = {
    success: <CheckCircle size={18} className="text-emerald-600 shrink-0" />,
    warning: <AlertCircle size={18} className="text-amber-600 shrink-0" />,
    error: <XCircle size={18} className="text-rose-600 shrink-0" />,
    info: <AlertCircle size={18} className="text-sky-600 shrink-0" />,
  }
  return (
    <div className={`relative flex gap-3 p-4 pl-5 rounded-xl border overflow-hidden ${styles[type]}`} role="alert">
      <span className={`absolute left-0 inset-y-0 w-1 bg-gradient-to-b ${accents[type]}`} aria-hidden="true" />
      {icons[type]}
      <div>
        {title && <p className="font-semibold text-sm">{title}</p>}
        <p className="text-sm">{message}</p>
      </div>
    </div>
  )
}

// --- EmptyState ---
export function EmptyState({ icon, title, message, action }: {
  icon: ReactNode
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/70 border border-white/70 flex items-center justify-center text-slate-300 mb-4 shadow-sm">{icon}</div>
      <h3 className="font-display text-base font-bold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-4">{message}</p>
      {action}
    </div>
  )
}

// --- StatsCard ---
export function StatsCard({ label, value, icon, color, delta }: {
  label: string
  value: string | number
  icon: ReactNode
  color: string
  delta?: string
}) {
  return (
    <Card className="p-5 group hover:-translate-y-0.5 hover:shadow-lift transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium mb-1">{label}</p>
          <p className="font-display text-2xl font-extrabold text-slate-900">{value}</p>
          {delta && <p className="text-xs text-emerald-600 mt-1 font-semibold">{delta}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color} ring-1 ring-inset ring-white/70 shadow-sm`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

// --- Tabs ---
export function Tabs({ tabs, active, onChange }: {
  tabs: string[]
  active: string
  onChange: (tab: string) => void
}) {
  return (
    <div className="inline-flex gap-1 p-1 bg-white/60 border border-white/70 backdrop-blur rounded-xl shadow-sm" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={active === tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${active === tab ? 'bg-white text-ea-teal-700 shadow-sm ring-1 ring-ea-teal-100' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

// --- SearchBar ---
export function SearchBar({ value, onChange, placeholder = 'Search...' }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 border border-white/70 bg-white/70 backdrop-blur rounded-xl text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-ea-teal-500/20 focus:border-ea-teal-400"
      />
    </div>
  )
}

// --- FileUpload ---
export function FileUpload({ label, accept, helperText, onChange }: {
  label?: string
  accept?: string
  helperText?: string
  onChange?: (file: File | null) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [drag, setDrag] = useState(false)
  const inputId = useId()

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); onChange?.(f) }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${drag ? 'border-ea-teal-400 bg-ea-teal-50/60 scale-[1.01]' : 'border-ea-teal-200/80 hover:border-ea-teal-400 bg-white/50 hover:bg-white/80'}`}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); onChange?.(f) }}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ea-teal-50 to-ea-blue-50 border border-ea-teal-100 flex items-center justify-center">
            <svg className="text-ea-teal-600" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          {file ? (
            <div>
              <p className="text-sm font-semibold text-ea-teal-700">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-slate-700">Drop file here or <span className="text-ea-teal-600 font-semibold">browse</span></p>
              {helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Timeline ---
export function Timeline({ steps }: { steps: { step: string; date: string; completed: boolean; active: boolean }[] }) {
  return (
    <ol className="relative border-l-2 border-slate-100 ml-3">
      {steps.map((s, i) => (
        <li key={i} className="mb-6 ml-6 relative">
          <span className={`absolute -left-[31px] flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white shadow-sm ${s.completed ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : s.active ? 'bg-gradient-to-br from-ea-teal-600 to-ea-blue-600 shadow-ea-blue-600/30' : 'bg-slate-200'}`}>
            {s.completed ? (
              <svg className="text-white" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <span className={`w-2 h-2 rounded-full ${s.active ? 'bg-white' : 'bg-slate-400'}`} />
            )}
          </span>
          <p className={`text-sm font-semibold ${s.completed || s.active ? 'text-slate-900' : 'text-slate-400'}`}>{s.step}</p>
          {s.date && <p className="text-xs text-slate-500">{s.date}</p>}
        </li>
      ))}
    </ol>
  )
}

// --- Pagination ---
export function Pagination({ page, total, perPage, onChange }: {
  page: number
  total: number
  perPage: number
  onChange: (p: number) => void
}) {
  const pages = Math.ceil(total / perPage)
  if (pages <= 1) return null
  const start = Math.max(1, Math.min(page - 2, pages - 4))
  const end = Math.min(pages, start + 4)
  return (
    <div className="flex items-center justify-between px-2 py-3">
      <p className="text-sm text-slate-500">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}</p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</Button>
        {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((p) => (
          <Button key={p} variant={p === page ? 'primary' : 'outline'} size="sm" onClick={() => onChange(p)}>{p}</Button>
        ))}
        <Button variant="outline" size="sm" disabled={page === pages} onClick={() => onChange(page + 1)}>Next</Button>
      </div>
    </div>
  )
}
