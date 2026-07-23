import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react'
import { CheckCircle, Clock, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

// --- Badge ---
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'blue'

const badgeStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  error: 'bg-red-50 text-red-700 border border-red-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  neutral: 'bg-gray-100 text-gray-600 border border-gray-200',
  blue: 'bg-blue-700 text-white border border-blue-700',
}

const badgeIcons: Partial<Record<BadgeVariant, ReactNode>> = {
  success: <CheckCircle size={12} />,
  warning: <Clock size={12} />,
  error: <XCircle size={12} />,
  info: <AlertCircle size={12} />,
}

export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeStyles[variant]}`}>
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
    Closed: 'neutral',
    Pending: 'warning',
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
  primary: 'bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-900 focus-visible:ring-2 focus-visible:ring-blue-500',
  secondary: 'bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200',
  outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100',
  ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
}

const btnSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
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
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${btnVariants[variant]} ${btnSizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
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
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between p-6 pb-0">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="ml-4">{action}</div>}
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
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input
          id={inputId}
          className={`w-full border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'} ${icon ? 'pl-10' : 'pl-3.5'} pr-3.5 py-2.5 ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
      {helperText && !error && <p className="text-xs text-gray-500">{helperText}</p>}
    </div>
  )
}

// --- PasswordInput ---
export function PasswordInput({ label, error, ...props }: Omit<InputProps, 'type' | 'icon'>) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={`w-full border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-3.5 pr-10 py-2.5 ${error ? 'border-red-400' : 'border-gray-300'}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-lg text-sm text-gray-900 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-3.5 pr-3.5 py-2.5 ${error ? 'border-red-400' : 'border-gray-300'}`}
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
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3.5 py-2.5 resize-none ${error ? 'border-red-400' : 'border-gray-300'}`}
      />
      {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
      {helperText && !error && <p className="text-xs text-gray-500">{helperText}</p>}
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${widths[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close">
            <XCircle size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// --- Alert ---
export function Alert({ type, title, message }: { type: 'success' | 'warning' | 'error' | 'info'; title?: string; message: string }) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }
  const icons = {
    success: <CheckCircle size={18} className="text-green-600 shrink-0" />,
    warning: <AlertCircle size={18} className="text-amber-600 shrink-0" />,
    error: <XCircle size={18} className="text-red-600 shrink-0" />,
    info: <AlertCircle size={18} className="text-blue-600 shrink-0" />,
  }
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${styles[type]}`} role="alert">
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
      <div className="text-gray-300 mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-4">{message}</p>
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
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {delta && <p className="text-xs text-green-600 mt-1 font-medium">{delta}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
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
    <div className="flex gap-1 border-b border-gray-200" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={active === tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${active === tab ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
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
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); onChange?.(f) }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${drag ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
        onClick={() => document.getElementById('file-upload-input')?.click()}
      >
        <input
          id="file-upload-input"
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); onChange?.(f) }}
        />
        <div className="flex flex-col items-center gap-2">
          <svg className="text-gray-400" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {file ? (
            <div>
              <p className="text-sm font-medium text-blue-700">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-700">Drop file here or <span className="text-blue-700">browse</span></p>
              {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
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
    <ol className="relative border-l border-gray-200 ml-3">
      {steps.map((s, i) => (
        <li key={i} className="mb-6 ml-6">
          <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white ${s.completed ? 'bg-green-500' : s.active ? 'bg-blue-700' : 'bg-gray-200'}`}>
            {s.completed ? (
              <svg className="text-white" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <span className={`w-2 h-2 rounded-full ${s.active ? 'bg-white' : 'bg-gray-400'}`} />
            )}
          </span>
          <p className={`text-sm font-semibold ${s.completed || s.active ? 'text-gray-900' : 'text-gray-400'}`}>{s.step}</p>
          {s.date && <p className="text-xs text-gray-500">{s.date}</p>}
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
  return (
    <div className="flex items-center justify-between px-2 py-3">
      <p className="text-sm text-gray-500">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}</p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</Button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
          <Button key={p} variant={p === page ? 'primary' : 'outline'} size="sm" onClick={() => onChange(p)}>{p}</Button>
        ))}
        <Button variant="outline" size="sm" disabled={page === pages} onClick={() => onChange(page + 1)}>Next</Button>
      </div>
    </div>
  )
}
