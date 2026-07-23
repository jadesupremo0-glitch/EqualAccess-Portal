import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import { Button, Input, PasswordInput, Select, FileUpload, Alert } from '../components/ui'

const disabilityTypes = [
  { value: 'visual', label: 'Visual Impairment' },
  { value: 'hearing', label: 'Hearing Impairment' },
  { value: 'physical', label: 'Physical Disability' },
  { value: 'mental', label: 'Mental Disability' },
  { value: 'chronic', label: 'Chronic Illness' },
  { value: 'learning', label: 'Learning Disability' },
  { value: 'psychosocial', label: 'Psychosocial Disability' },
  { value: 'other', label: 'Other' },
]

const barangays = [
  { value: 'malinta', label: 'Brgy. Malinta' },
  { value: 'batong-malake', label: 'Brgy. Batong Malake' },
  { value: 'bayog', label: 'Brgy. Bayog' },
  { value: 'anos', label: 'Brgy. Anos' },
  { value: 'maahas', label: 'Brgy. Maahas' },
  { value: 'putho-tuntungin', label: 'Brgy. Putho-Tuntungin' },
  { value: 'bagong-kalsada', label: 'Brgy. Bagong Kalsada' },
  { value: 'san-antonio', label: 'Brgy. San Antonio' },
]

const steps = [
  { n: 1, label: 'Personal Info' },
  { n: 2, label: 'Disability Info' },
  { n: 3, label: 'Upload PWD ID' },
  { n: 4, label: 'Account Setup' },
]

export default function Register({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    fullName: '', address: '', barangay: '', contact: '', email: '',
    disabilityType: '', otherDisability: '',
    username: '', password: '', confirmPassword: '',
    agreeTerms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const validateStep = () => {
    const e: Record<string, string> = {}
    if (step === 1) {
      if (!form.fullName) e.fullName = 'Full name is required'
      if (!form.address) e.address = 'Address is required'
      if (!form.barangay) e.barangay = 'Please select your barangay'
      if (!form.contact) e.contact = 'Contact number is required'
    }
    if (step === 2) {
      if (!form.disabilityType) e.disabilityType = 'Please select a disability type'
    }
    if (step === 4) {
      if (!form.username) e.username = 'Username is required'
      if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
      if (!form.agreeTerms) e.agreeTerms = 'You must agree to continue'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validateStep()) { if (step === 4) setDone(true); else setStep(step + 1) } }
  const back = () => { if (step > 1) setStep(step - 1) }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 max-w-lg w-full text-center">
          <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
          <p className="text-gray-500 mb-5 text-sm leading-relaxed">
            Thank you for registering, <strong>{form.fullName || 'User'}</strong>. Your application has been submitted to the PDAO.
          </p>
          <Alert
            type="info"
            title="PDAO Review Required"
            message="Your account will be reviewed by an administrator before activation. This typically takes 3–5 business days. You will receive a notification once your account is verified."
          />
          <div className="mt-6 space-y-3">
            <button
              onClick={() => onNavigate('login')}
              className="w-full py-3 text-sm font-semibold bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
            >
              Proceed to Login
            </button>
            <Button fullWidth variant="outline" onClick={() => onNavigate('landing')}>Back to Home</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center">
              <span className="text-white font-black text-sm">EA</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">EqualAccess Portal</p>
              <p className="text-xs text-gray-400">PDAO — Los Baños, Laguna</p>
            </div>
          </div>
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600">
            <ArrowLeft size={14} />
            Back to Home
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-6 pt-10">
        <div className="w-full max-w-2xl">
          {/* Progress steps */}
          <div className="mb-8 flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      step > s.n ? 'bg-teal-500 text-white' :
                      step === s.n ? 'bg-teal-700 text-white ring-4 ring-teal-100' :
                      'bg-gray-100 text-gray-400'
                    }`}
                    aria-current={step === s.n ? 'step' : undefined}
                  >
                    {step > s.n ? <CheckCircle size={16} /> : s.n}
                  </div>
                  <p className={`text-xs mt-1.5 hidden sm:block font-medium ${step >= s.n ? 'text-gray-700' : 'text-gray-400'}`}>
                    {s.label}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 mb-5 rounded-full ${step > s.n ? 'bg-teal-400' : 'bg-gray-200'}`} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-teal-700 px-6 py-5">
              <h1 className="text-white font-bold text-lg">{steps[step - 1].label}</h1>
              <p className="text-teal-200 text-sm mt-0.5">Step {step} of 4 — EqualAccess Portal Registration</p>
            </div>

            <div className="p-6 space-y-4">
              {step === 1 && (
                <>
                  <Input label="Full Name" placeholder="e.g., Maria Santos Reyes" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} error={errors.fullName} required />
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
                  <p className="text-sm text-gray-600 leading-relaxed">Upload a clear photo or scan of your PWD ID issued by the Municipality of Los Baños. This will be reviewed by PDAO staff.</p>
                  <FileUpload label="PWD ID — Front Side" accept=".jpg,.jpeg,.png,.pdf" helperText="JPG, PNG, or PDF · Max 5 MB" />
                  <FileUpload label="PWD ID — Back Side" accept=".jpg,.jpeg,.png,.pdf" helperText="JPG, PNG, or PDF · Max 5 MB" />
                  <Alert type="warning" title="Important" message="Ensure all ID details are clearly visible. Blurry or incomplete images will delay your PDAO verification." />
                </>
              )}
              {step === 4 && (
                <>
                  <Input label="Username" placeholder="Choose a unique username" value={form.username} onChange={(e) => set('username', e.target.value)} error={errors.username} helperText="5–20 characters. Letters, numbers, underscores only." required />
                  <PasswordInput label="Password" placeholder="Create a strong password (min. 8 characters)" value={form.password} onChange={(e) => set('password', e.target.value)} error={errors.password} required />
                  <PasswordInput label="Confirm Password" placeholder="Re-enter your password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} error={errors.confirmPassword} required />
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.agreeTerms} onChange={(e) => set('agreeTerms', e.target.checked)}
                        className="mt-0.5 w-4 h-4 border-gray-300 rounded text-teal-600 focus:ring-teal-500" />
                      <span className="text-sm text-gray-600">
                        I agree to the <a href="#" className="text-teal-700 font-medium hover:underline">Terms of Use</a> and <a href="#" className="text-teal-700 font-medium hover:underline">Privacy Policy</a>. I consent to the collection of my personal data for PDAO benefit processing purposes.
                      </span>
                    </label>
                    {errors.agreeTerms && <p className="text-xs text-red-600 mt-1 ml-7">{errors.agreeTerms}</p>}
                  </div>
                  <Alert type="info" title="Account Activation" message="Your account will be reviewed and activated by PDAO staff. This typically takes 3–5 business days after submission." />
                </>
              )}
            </div>

            <div className="flex items-center justify-between p-6 pt-0 gap-3 border-t border-gray-50">
              <Button variant="outline" size="lg" onClick={step === 1 ? () => onNavigate('login') : back} icon={<ArrowLeft size={15} />}>
                {step === 1 ? 'Back to Login' : 'Previous'}
              </Button>
              <button
                onClick={next}
                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                {step === 4 ? <><CheckCircle size={15} /> Create Account</> : <>Continue <ArrowRight size={15} /></>}
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <button onClick={() => onNavigate('login')} className="text-teal-700 font-semibold hover:text-teal-800">Sign in here</button>
          </p>
        </div>
      </div>
    </div>
  )
}
