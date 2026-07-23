import { useState } from 'react'
import {
  ArrowRight, ChevronDown, Phone, Mail, MapPin,
  Shield, Clock, Globe, Award, CheckCircle,
  Accessibility, BookOpen, Briefcase, HeartHandshake,
} from 'lucide-react'
import { Button } from '../components/ui'

function EALogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shrink-0 shadow-sm">
        <span className="text-white font-black text-sm tracking-tight">EA</span>
      </div>
      <div>
        <p className="font-extrabold text-gray-900 text-sm leading-tight">EqualAccess Portal</p>
        <p className="text-[11px] text-gray-400">PDAO — Los Baños, Laguna</p>
      </div>
    </div>
  )
}

const faqs = [
  {
    q: 'Who can use the EqualAccess Portal?',
    a: 'Any person with a disability (PWD) who is a resident of Los Baños, Laguna and holds a valid PWD ID issued by the LGU can register. Caregivers may also register on behalf of PWDs who are unable to do so themselves.',
  },
  {
    q: 'How long does PDAO account verification take?',
    a: 'Account verification by the PDAO typically takes 3–5 business days after submission of required documents. You will receive a notification once your account is activated.',
  },
  {
    q: 'What documents are required to register?',
    a: 'You will need a valid PWD ID, a government-issued ID, and your Barangay Certificate of Residency. Additional documents may be required depending on the type of assistance you are applying for.',
  },
  {
    q: 'Is the EqualAccess Portal free?',
    a: 'Yes. The portal is completely free for all PWD residents of Los Baños. There are no fees for registration, application, or any services offered through the system.',
  },
  {
    q: 'Can I apply for multiple programs?',
    a: 'Yes. You may apply for multiple programs provided you meet the eligibility requirements for each. Each application will be reviewed separately by PDAO staff.',
  },
]

const benefitCategories = [
  { icon: <HeartHandshake size={22} className="text-teal-600" />, title: 'Financial Assistance', desc: 'Monthly cash support and emergency financial aid for qualified PWDs' },
  { icon: <Shield size={22} className="text-blue-600" />, title: 'Medical Assistance', desc: 'Hospital bills, medicines, and referrals to partner hospitals' },
  { icon: <Accessibility size={22} className="text-teal-600" />, title: 'Assistive Devices', desc: 'Wheelchairs, hearing aids, crutches, and mobility equipment' },
  { icon: <BookOpen size={22} className="text-blue-600" />, title: 'Educational Assistance', desc: 'PDAO scholarship grants and monthly stipends for PWD students' },
  { icon: <Award size={22} className="text-teal-600" />, title: 'Livelihood Programs', desc: 'Skills training in agri-entrepreneurship, crafts, and technology' },
  { icon: <Briefcase size={22} className="text-blue-600" />, title: 'Job Matching', desc: 'Curated PWD-friendly job listings matched to your skills and profile' },
]

const steps = [
  { n: '01', title: 'Create Your Account', desc: 'Register with your personal and disability information on the EqualAccess Portal.' },
  { n: '02', title: 'PDAO Verification', desc: 'Submit your PWD ID for review. PDAO staff will verify your account within 3–5 business days.' },
  { n: '03', title: 'Explore & Apply', desc: 'Browse benefits programs, apply for assistance, and find matching job opportunities.' },
  { n: '04', title: 'Track in Real Time', desc: 'Monitor your application status with a live timeline from submission to completion.' },
]

const previewJobs = [
  { title: 'Customer Service Representative', company: 'UPLB Tech Transfer', location: 'Los Baños, Laguna', match: 94, type: 'Full-time' },
  { title: 'Data Encoder', company: 'Municipality of Los Baños', location: 'Los Baños, Laguna', match: 87, type: 'Full-time' },
  { title: 'Remote Content Writer', company: 'IRRI Communications', location: 'Remote', match: 78, type: 'Remote' },
]

export default function Landing({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white font-sans">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
        Skip to main content
      </a>

      {/* Gov banner */}
      <div className="bg-teal-900 text-teal-100 text-[11px] py-1.5 text-center font-medium tracking-wide" role="banner">
        Official Digital Platform — Persons with Disabilities Affairs Office (PDAO), Los Baños, Laguna
      </div>

      {/* Navbar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <EALogo />
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            {['Home', 'Benefits', 'Job Opportunities', 'About', 'Contact'].map((item) => (
              <a key={item} href="#" className="text-sm text-gray-500 hover:text-teal-700 font-medium transition-colors">
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onNavigate('login')}>Log In</Button>
            <Button size="sm" onClick={() => onNavigate('register')} className="bg-teal-600 hover:bg-teal-700 text-white border-0">
              Register
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-900 via-teal-800 to-blue-900 py-20 lg:py-28" aria-labelledby="hero-heading">
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} aria-hidden="true" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
            <div>
              {/* Chip */}
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-teal-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                PDAO Los Baños — Official Platform
              </div>
              <h1 id="hero-heading" className="text-4xl lg:text-5xl font-extrabold text-white leading-[1.1] mb-5">
                Equal Access to Government Benefits, Programs, and Opportunities
              </h1>
              <p className="text-teal-100 text-lg leading-relaxed mb-8 max-w-lg">
                Access government assistance, browse available programs, submit requests, and monitor your application through one centralized platform designed for Persons with Disabilities.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <button
                  onClick={() => onNavigate('register')}
                  className="inline-flex items-center gap-2 bg-white text-teal-800 font-semibold px-6 py-3 rounded-xl hover:bg-teal-50 transition-colors text-sm shadow-lg"
                >
                  Register Now <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => {}}
                  className="inline-flex items-center gap-2 border border-white/30 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
                >
                  Explore Benefits
                </button>
              </div>
              <div className="flex flex-wrap gap-5 text-sm text-teal-200">
                {['Free to use', 'Secure & private', 'WCAG accessible', 'PDAO-verified'].map((f) => (
                  <span key={f} className="flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-teal-400" />{f}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — illustration + floating stats */}
            <div className="relative hidden lg:block">
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <img
                  src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=420&fit=crop&auto=format"
                  alt="Diverse group of persons with disabilities using digital services"
                  className="w-full h-[340px] object-cover"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-teal-900/40 to-transparent" />
              </div>
              {/* Stat cards */}
              <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
                <p className="text-2xl font-extrabold text-teal-700">212</p>
                <p className="text-xs text-gray-500 font-medium">Registered PWDs</p>
              </div>
              <div className="absolute -top-5 -right-5 bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
                <p className="text-2xl font-extrabold text-blue-700">71%</p>
                <p className="text-xs text-gray-500 font-medium">Approval Rate</p>
              </div>
              {/* Portal badge */}
              <div className="absolute bottom-8 right-4 bg-teal-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                ✓ PDAO Official
              </div>
            </div>
          </div>
        </section>

        {/* Stats ticker */}
        <section className="bg-teal-700 py-5" aria-label="System statistics">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { v: '212', l: 'Registered PWDs' },
              { v: '6', l: 'Active Programs' },
              { v: '₱1.4M+', l: 'Benefits Distributed' },
              { v: '7', l: 'Barangays Served' },
            ].map((s) => (
              <div key={s.l}>
                <p className="text-2xl font-extrabold text-white">{s.v}</p>
                <p className="text-teal-200 text-xs font-medium">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About the Portal */}
        <section className="py-16 px-4 bg-white" aria-labelledby="about-heading">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-teal-600 text-xs font-bold uppercase tracking-widest mb-3">About the Portal</p>
              <h2 id="about-heading" className="text-3xl font-extrabold text-gray-900 leading-tight mb-5">
                One Platform for All PWD Services in Los Baños
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                The EqualAccess Portal is a thesis capstone project developed for the Persons with Disabilities Affairs Office (PDAO) of Los Baños, Laguna. It aims to centralize access to government benefits, streamline assistance requests, and connect PWDs with employment opportunities — all in one accessible, data-driven platform.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Built in accordance with WCAG accessibility standards, the portal supports a wide range of disabilities and prioritizes ease of use for all users, including those with visual, hearing, physical, cognitive, and psychosocial disabilities.
              </p>
              <div className="mt-6 flex gap-3">
                <Button size="md" onClick={() => onNavigate('register')} className="bg-teal-600 hover:bg-teal-700 text-white border-0">
                  Get Started
                </Button>
                <Button variant="outline" size="md" onClick={() => onNavigate('login')}>
                  Sign In
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <Shield size={20} className="text-teal-600" />, title: 'Secure', desc: 'Your data is encrypted and protected under Philippine data privacy laws.' },
                { icon: <Clock size={20} className="text-blue-600" />, title: '24/7 Access', desc: 'Access your dashboard and track requests anytime from any device.' },
                { icon: <Globe size={20} className="text-teal-600" />, title: 'Accessible', desc: 'High contrast, large text, and screen reader support built in.' },
                { icon: <Award size={20} className="text-blue-600" />, title: 'Official PDAO', desc: 'Operated and managed by the PDAO of Los Baños, Laguna.' },
              ].map((f) => (
                <div key={f.title} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center mb-3 shadow-sm border border-gray-100">
                    {f.icon}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">{f.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 px-4 bg-gray-50" aria-labelledby="how-heading">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-teal-600 text-xs font-bold uppercase tracking-widest mb-2">Process</p>
              <h2 id="how-heading" className="text-3xl font-extrabold text-gray-900 mb-3">How It Works</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Four simple steps to access the government benefits and programs you deserve.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {steps.map((s, i) => (
                <div key={s.n} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative">
                  <div className="text-4xl font-black text-gray-100 mb-3 leading-none">{s.n}</div>
                  <div className={`w-10 h-1 rounded-full mb-4 ${i % 2 === 0 ? 'bg-teal-500' : 'bg-blue-500'}`} />
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button size="lg" onClick={() => onNavigate('register')} className="bg-teal-600 hover:bg-teal-700 text-white border-0">
                Start Registration <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </section>

        {/* Featured Benefits */}
        <section className="py-16 px-4 bg-white" aria-labelledby="benefits-heading">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-teal-600 text-xs font-bold uppercase tracking-widest mb-2">Programs</p>
              <h2 id="benefits-heading" className="text-3xl font-extrabold text-gray-900 mb-3">Featured Benefits & Programs</h2>
              <p className="text-gray-500 max-w-xl mx-auto">PDAO Los Baños offers a comprehensive range of programs and services for PWDs.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {benefitCategories.map((b) => (
                <div key={b.title} className="flex gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-sm transition-all group cursor-pointer">
                  <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-gray-100 group-hover:border-teal-200 transition-colors">
                    {b.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm group-hover:text-teal-700 transition-colors">{b.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button variant="outline" size="lg" onClick={() => onNavigate('login')}>
                View All Programs <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </section>

        {/* Job Opportunities Preview */}
        <section className="py-16 px-4 bg-gradient-to-br from-teal-50 to-blue-50" aria-labelledby="jobs-heading">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
              <div>
                <p className="text-teal-600 text-xs font-bold uppercase tracking-widest mb-2">Employment</p>
                <h2 id="jobs-heading" className="text-3xl font-extrabold text-gray-900">Job Opportunities for PWDs</h2>
                <p className="text-gray-500 mt-2 max-w-xl">Curated PWD-friendly job listings matched to your skills and qualifications. Jobs are ranked by compatibility percentage.</p>
              </div>
              <Button variant="outline" onClick={() => onNavigate('login')} className="shrink-0">
                Browse All Jobs
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {previewJobs.map((j) => (
                <div key={j.title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  {/* Match indicator */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${j.type === 'Remote' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                      {j.type}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="relative w-8 h-8">
                        <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#0d9488" strokeWidth="3"
                            strokeDasharray={`${(j.match / 100) * 94} 94`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-teal-700">{j.match}%</span>
                      </div>
                      <span className="text-xs text-gray-400">match</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-0.5">{j.title}</h3>
                  <p className="text-sm text-teal-700 font-medium mb-3">{j.company}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={11} />{j.location}</p>
                  <button
                    onClick={() => onNavigate('login')}
                    className="w-full mt-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
                  >
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-4 bg-white" aria-labelledby="faq-heading">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-teal-600 text-xs font-bold uppercase tracking-widest mb-2">FAQ</p>
              <h2 id="faq-heading" className="text-3xl font-extrabold text-gray-900 mb-3">Frequently Asked Questions</h2>
              <p className="text-gray-500">Common questions about the EqualAccess Portal and PDAO services.</p>
            </div>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                    className="w-full flex items-center justify-between p-5 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors text-sm"
                  >
                    {faq.q}
                    <ChevronDown size={17} className={`text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-14 px-4 bg-gray-50 border-t border-gray-100" aria-labelledby="contact-heading">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 id="contact-heading" className="text-2xl font-extrabold text-gray-900 mb-2">Contact the PDAO</h2>
              <p className="text-gray-500 text-sm">The Persons with Disabilities Affairs Office is here to help you.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {[
                { icon: <Phone size={18} />, label: 'Hotline', value: '+63 49 536 0050', sub: 'Mon–Fri, 8 AM–5 PM' },
                { icon: <Mail size={18} />, label: 'Email', value: 'pdao@losbanos.gov.ph', sub: 'Response within 2 business days' },
                { icon: <MapPin size={18} />, label: 'Office', value: 'Los Baños Municipal Hall, Laguna', sub: 'PDAO Office, Ground Floor' },
              ].map((c) => (
                <div key={c.label} className="flex gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="text-teal-600 shrink-0 mt-0.5">{c.icon}</div>
                  <div>
                    <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wide mb-0.5">{c.label}</p>
                    <p className="font-semibold text-gray-900 text-sm">{c.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 bg-teal-800 text-white" aria-labelledby="cta-heading">
          <div className="max-w-4xl mx-auto text-center">
            <h2 id="cta-heading" className="text-3xl font-extrabold mb-4">Ready to Access Your Benefits?</h2>
            <p className="text-teal-200 text-lg mb-8 max-w-2xl mx-auto">
              Join 212+ PWDs in Los Baños who are already using the EqualAccess Portal to access government assistance. Registration is free and takes less than 10 minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => onNavigate('register')}
                className="inline-flex items-center gap-2 bg-white text-teal-800 font-bold px-7 py-3.5 rounded-xl hover:bg-teal-50 transition-colors shadow-lg"
              >
                Register Now — It's Free <ArrowRight size={16} />
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="inline-flex items-center gap-2 border border-white/30 text-white font-medium px-7 py-3.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                I Already Have an Account
              </button>
            </div>
          </div>
        </section>

        {/* Accessibility Statement */}
        <section className="py-6 px-4 bg-teal-50 border-y border-teal-100" aria-labelledby="a11y-heading">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="text-teal-600 shrink-0"><Accessibility size={24} /></div>
            <div>
              <p id="a11y-heading" className="text-sm font-semibold text-teal-800">Accessibility Commitment</p>
              <p className="text-xs text-teal-600">The EqualAccess Portal is designed to comply with WCAG 2.1 Level AA guidelines. We are committed to making digital services inclusive for all Persons with Disabilities. If you encounter any accessibility issues, please <a href="#" className="underline font-medium">contact us</a>.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4" role="contentinfo">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                  <span className="text-white font-black text-xs">EA</span>
                </div>
                <p className="text-white font-bold text-sm">EqualAccess Portal</p>
              </div>
              <p className="text-xs leading-relaxed">Official digital platform of the PDAO of Los Baños, Laguna for PWD benefit management and assistance services.</p>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Quick Links</p>
              <ul className="space-y-2 text-xs">
                {['Benefits & Programs', 'Assistance Request', 'Job Matching', 'About the Portal'].map((l) => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Legal</p>
              <ul className="space-y-2 text-xs">
                {['Privacy Policy', 'Terms of Use', 'Accessibility Statement', 'Data Privacy Notice'].map((l) => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">PDAO Contact</p>
              <ul className="space-y-1.5 text-xs">
                <li>📞 +63 49 536 0050</li>
                <li>✉️ pdao@losbanos.gov.ph</li>
                <li>📍 Municipal Hall, Los Baños</li>
                <li>🕐 Mon–Fri, 8 AM–5 PM</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <p>© 2024 Municipality of Los Baños — PDAO. All rights reserved.</p>
            <p>EqualAccess Portal — A Capstone Thesis Project</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
