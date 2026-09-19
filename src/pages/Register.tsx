import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import { Button, Input, PasswordInput, Select, FileUpload, Alert } from '../components/ui'
import { useStore } from '../store'
import logoUrl from '../assets/logo.png'

const disabilityTypes = [
  { value: 'cancer', label: 'Cancer (RA 11215)' },
  { value: 'deaf', label: 'Deaf or Hard of Hearing' },
  { value: 'intellectual', label: 'Intellectual Disability' },
  { value: 'learning', label: 'Learning Disability' },
  { value: 'mental', label: 'Mental Disability' },
  { value: 'physical', label: 'Physical Disability' },
  { value: 'psychosocial', label: 'Psychosocial Disability' },
  { value: 'rare', label: 'Rare Disease (RA 10747)' },
  { value: 'speech', label: 'Speech and Language Impairment' },
  { value: 'visual', label: 'Visual Disability' },
  { value: 'other', label: 'Other' },
]

const barangays = [
  { value: 'anos', label: 'Anos' },
  { value: 'bagong-silang', label: 'Bagong Silang' },
  { value: 'bambang', label: 'Bambang' },
  { value: 'batong-malake', label: 'Batong Malake' },
  { value: 'baybayin', label: 'Baybayin' },
  { value: 'bayog', label: 'Bayog' },
  { value: 'lalakay', label: 'Lalakay' },
  { value: 'maahas', label: 'Maahas' },
  { value: 'malinta', label: 'Malinta' },
  { value: 'mayondon', label: 'Mayondon' },
  { value: 'putho-tuntungin', label: 'Putho-Tuntungin' },
  { value: 'san-antonio', label: 'San Antonio' },
  { value: 'tadlac', label: 'Tadlac' },
  { value: 'timugan', label: 'Timugan' },
]

const steps = [
  { n: 1, label: 'Personal Info' },
  { n: 2, label: 'Disability Info' },
  { n: 3, label: 'Upload PWD ID' },
  { n: 4, label: 'Account Setup' },
]

export default function Register({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { registerPWD } = useStore()
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState({
    fullName: '', age: '', address: '', barangay: '', contact: '', email: '',
    disabilityType: '', otherDisability: '',
    pwdIdNumber: '', password: '', confirmPassword: '',
    agreeTerms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Map barangay slug value → display label
  const barangayLabelMap: Record<string, string> = {
    anos: 'Brgy. Anos', 'bagong-silang': 'Brgy. Bagong Silang', bambang: 'Brgy. Bambang',
    'batong-malake': 'Brgy. Batong Malake', baybayin: 'Brgy. Baybayin', bayog: 'Brgy. Bayog',
    lalakay: 'Brgy. Lalakay', maahas: 'Brgy. Maahas', malinta: 'Brgy. Malinta',
    mayondon: 'Brgy. Mayondon', 'putho-tuntungin': 'Brgy. Putho-Tuntungin',
    'san-antonio': 'Brgy. San Antonio', tadlac: 'Brgy. Tadlac', timugan: 'Brgy. Timugan',
  }

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const validateStep = () => {
    const e: Record<string, string> = {}
    if (step === 1) {
      if (!form.fullName) e.fullName = 'Full name is required'
      if (!form.age || Number(form.age) < 1) e.age = 'Age is required'
      if (!form.address) e.address = 'Address is required'
      if (!form.barangay) e.barangay = 'Please select your barangay'
      if (!form.contact) e.contact = 'Contact number is required'
    }
    if (step === 2) {
      if (!form.disabilityType) e.disabilityType = 'Please select a disability type'
    }
    if (step === 4) {
      if (!form.pwdIdNumber) e.pwdIdNumber = 'PWD ID No. is required'
      if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
      if (!form.agreeTerms) e.agreeTerms = 'You must agree to continue'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (validateStep()) {
      if (step === 4) {
        // Persist user to store
        const result = registerPWD({
          fullName: form.fullName.trim(),
          age: Number(form.age),
          address: form.address.trim(),
          barangay: barangayLabelMap[form.barangay] ?? form.barangay,
          contact: form.contact.trim(),
          email: form.email.trim(),
          disabilityType: form.disabilityType,
          otherDisability: form.otherDisability?.trim() || undefined,
          pwdIdNumber: form.pwdIdNumber.trim(),
          password: form.password,
        })
        if (result.error) {
          setSubmitError(result.error)
          return
        }
        setDone(true)
      } else {
        setStep(step + 1)
      }
    }
  }
  const back = () => { if (step > 1) setStep(step - 1) }

  if (done) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 bg-slate-50">
        <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -right-24 w-[26rem] h-[26rem] rounded-full bg-gradient-to-br from-ea-teal-400/25 to-sky-400/20 blur-3xl animate-blob" />
          <div className="absolute bottom-0 -left-24 w-[24rem] h-[24rem] rounded-full bg-gradient-to-tr from-ea-blue-500/20 to-indigo-400/15 blur-3xl animate-blob-delayed" />
        </div>
        <div className="card-glass rounded-3xl p-10 max-w-lg w-full text-center animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-ea-teal-400 to-ea-blue-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-ea-teal-600/30 ring-4 ring-ea-teal-100">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Registration Submitted!</h2>
          <p className="text-slate-500 mb-5 text-sm leading-relaxed">
            Thank you for registering, <strong>{form.fullName || 'User'}</strong>. Your application has been submitted to the PDAO.
          </p>
          <Alert
            type="info"
            title="PDAO Review Required"
            message="Your account will be reviewed by an administrator before activation. This typically takes 3–5 business days. You will receive a notification once your account is verified."
          />
          <div className="mt-6 space-y-3">
            <Button size="lg" fullWidth onClick={() => onNavigate('login')}>Proceed to Login</Button>
            <Button fullWidth variant="outline" onClick={() => onNavigate('landing')}>Back to Home</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 right-1/4 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-ea-teal-400/20 to-sky-400/15 blur-3xl animate-blob" />
        <div className="absolute bottom-0 -left-20 w-[24rem] h-[24rem] rounded-full bg-gradient-to-tr from-ea-blue-500/15 to-indigo-400/10 blur-3xl animate-blob-delayed" />
      </div>

      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-white/60 px-4 py-4 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ea-teal-500 to-ea-blue-600 flex items-center justify-center shadow-lg shadow-ea-teal-600/25 overflow-hidden">
              <img src={logoUrl} alt="EqualAccess Portal logo" className="w-full h-full object-contain" draggable={false} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 font-display tracking-tight">EqualAccess Portal</p>
              <p className="text-xs text-slate-400">PDAO — Los Baños, Laguna</p>
            </div>
          </div>
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
            <ArrowLeft size={14} />
            Back to Home
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-6 pt-10">
        <div className="w-full max-w-2xl animate-fade-up">
          {/* Progress steps */}
          <div className="mb-8 flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      step > s.n ? 'bg-gradient-to-br from-ea-teal-500 to-ea-blue-600 text-white shadow-lg shadow-ea-teal-600/25' :
                      step === s.n ? 'bg-gradient-to-br from-ea-teal-600 to-ea-blue-700 text-white ring-4 ring-ea-teal-200 shadow-lg shadow-ea-blue-600/25' :
                      'bg-white/70 border border-white/70 text-slate-400 shadow-sm'
                    }`}
                    aria-current={step === s.n ? 'step' : undefined}
                  >
                    {step > s.n ? <CheckCircle size={16} /> : s.n}
                  </div>
                  <p className={`text-xs mt-1.5 hidden sm:block font-semibold ${step >= s.n ? 'text-slate-700' : 'text-slate-400'}`}>
                    {s.label}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-3 mb-5 rounded-full ${step > s.n ? 'bg-gradient-to-r from-ea-teal-500 to-ea-blue-600' : 'bg-white/70 border border-white/60'}`} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          {/* Form card */}
          <div className="card-glass rounded-3xl overflow-hidden shadow-xl">
            <div className="relative bg-brand-glow px-6 py-5 overflow-hidden">
              <div className="absolute inset-0 bg-decor-grid opacity-15" aria-hidden="true" />
              <div className="relative">
                <h1 className="font-display text-white font-bold text-lg tracking-tight">{steps[step - 1].label}</h1>
                <p className="text-teal-200/90 text-sm mt-0.5">Step {step} of 4 — EqualAccess Portal Registration</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {step === 1 && (
                <>
                  <Input label="Full Name" placeholder="e.g., Maria Santos Reyes" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} error={errors.fullName} required />
                  <Input label="Age" type="number" placeholder="e.g., 25" value={form.age} onChange={(e) => set('age', e.target.value)} error={errors.age} required />
                  <Input label="Home Address" placeholder="House No., Street Name" value={form.address} onChange={(e) => set('address', e.target.value)} error={errors.address} required />
                  <Select label="Barangay (Los Baños)" options={barangays} value={form.barangay} onChange={(v) => set('barangay', v)} placeholder="Select your barangay" error={errors.barangay} required />
                  <Input label="Contact Number" type="tel" placeholder="+63 9XX XXX XXXX" value={form.contact} onChange={(e) => set('contact', e.target.value)} error={errors.contact} required />
                  <Input label="Email Address (optional)" type="email" placeholder="your.email@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                </>
              )}
              {step === 2 && (
                <>
                  <Select label="Type of Disability" options={disabilityTypes} value={form.disabilityType} onChange={(v) => set('disabilityType', v)} placeholder="Select disability type" error={errors.disabilityType} required />
                  {form.disabilityType === 'other' && (
                    <Input label="Please specify your disability" placeholder="Describe your disability" value={form.otherDisability} onChange={(e) => set('otherDisability', e.target.value)} />
                  )}
                  <Alert type="info" message="This information is strictly confidential and used only to match you with appropriate programs and assistance offered by the PDAO." />
                </>
              )}
              {step === 3 && (
                <>
                  <p className="text-sm text-slate-600 leading-relaxed">Upload a clear photo or scan of your PWD ID issued by the Municipality of Los Baños. This will be reviewed by PDAO staff.</p>
                  <FileUpload label="PWD ID — Front Side" accept=".jpg,.jpeg,.png,.pdf" helperText="JPG, PNG, or PDF · Max 5 MB" />
                  <FileUpload label="PWD ID — Back Side" accept=".jpg,.jpeg,.png,.pdf" helperText="JPG, PNG, or PDF · Max 5 MB" />
                  <Alert type="warning" title="Important" message="Ensure all ID details are clearly visible. Blurry or incomplete images will delay your PDAO verification." />
                </>
              )}
              {step === 4 && (
                <>
                  {submitError && <Alert type="error" message={submitError} />}
                  <Input label="PWD ID No." placeholder="e.g., LB-PHY-2024-00123" value={form.pwdIdNumber} onChange={(e) => set('pwdIdNumber', e.target.value)} error={errors.pwdIdNumber} helperText="Enter the PWD ID number from your PWD ID card." required />
                  <PasswordInput label="Password" placeholder="Create a strong password (min. 8 characters)" value={form.password} onChange={(e) => set('password', e.target.value)} error={errors.password} required />
                  <PasswordInput label="Confirm Password" placeholder="Re-enter your password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} error={errors.confirmPassword} required />
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.agreeTerms} onChange={(e) => set('agreeTerms', e.target.checked)}
                        className="mt-0.5 w-4 h-4 border-gray-300 rounded text-ea-teal-600 focus:ring-ea-teal-500" />
                      <span className="text-sm text-slate-600">
                        I agree to the <a href="#" className="text-ea-teal-700 font-medium hover:underline">Terms of Use</a> and <a href="#" className="text-ea-teal-700 font-medium hover:underline">Privacy Policy</a>. I consent to the collection of my personal data for PDAO benefit processing purposes.
                      </span>
                    </label>
                    {errors.agreeTerms && <p className="text-xs text-red-600 mt-1 ml-7">{errors.agreeTerms}</p>}
                  </div>
                  <Alert type="info" title="Account Activation" message="Your account will be reviewed and activated by PDAO staff. This typically takes 3–5 business days after submission." />
                </>
              )}
            </div>

            <div className="flex items-center justify-between p-6 pt-0 gap-3 border-t border-white/60">
              <Button variant="outline" size="lg" onClick={step === 1 ? () => onNavigate('login') : back} icon={<ArrowLeft size={15} />}>
                {step === 1 ? 'Back to Login' : 'Previous'}
              </Button>
              <Button size="lg" onClick={next} icon={step === 4 ? <CheckCircle size={16} /> : <ArrowRight size={16} />}>
                {step === 4 ? 'Create Account' : 'Continue'}
              </Button>
            </div>
          </div>

          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{' '}
            <button onClick={() => onNavigate('login')} className="text-ea-teal-700 font-semibold hover:text-ea-teal-800">Sign in here</button>
          </p>
        </div>
      </div>
    </div>
  )
}
