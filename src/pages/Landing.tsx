import { useState } from 'react'
import {
  ArrowRight, ChevronDown, Phone, Mail, MapPin,
  Shield, Clock, Globe, Award, CheckCircle,
  Accessibility, BookOpen, HeartHandshake, Sparkles,
} from 'lucide-react'
import { Button } from '../components/ui'

function EALogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ea-teal-500 to-ea-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-ea-teal-600/25 ring-1 ring-white/40">
        <span className="text-white font-black text-sm tracking-tight font-display">EA</span>
      </div>
      <div>
        <p className="font-display font-extrabold text-slate-900 text-sm leading-tight tracking-tight">EqualAccess Portal</p>
        <p className="text-[11px] text-slate-400">PDAO — Los Baños, Laguna</p>
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
  { icon: <HeartHandshake size={22} className="text-ea-teal-600" />, title: 'Financial Assistance', desc: 'Monthly cash support and emergency financial aid for qualified PWDs', tint: 'from-ea-teal-50 to-emerald-50 border-ea-teal-100' },
  { icon: <Shield size={22} className="text-ea-blue-600" />, title: 'Medical Assistance', desc: 'Hospital bills, medicines, and referrals to partner hospitals', tint: 'from-ea-blue-50 to-sky-50 border-ea-blue-100' },
  { icon: <Accessibility size={22} className="text-ea-teal-600" />, title: 'Assistive Devices', desc: 'Wheelchairs, hearing aids, crutches, and mobility equipment', tint: 'from-ea-teal-50 to-emerald-50 border-ea-teal-100' },
  { icon: <BookOpen size={22} className="text-ea-blue-600" />, title: 'Educational Assistance', desc: 'PDAO scholarship grants and monthly stipends for PWD students', tint: 'from-ea-blue-50 to-sky-50 border-ea-blue-100' },
  { icon: <Award size={22} className="text-ea-teal-600" />, title: 'Livelihood Programs', desc: 'Skills training in agri-entrepreneurship, crafts, and technology', tint: 'from-ea-teal-50 to-emerald-50 border-ea-teal-100' },
]

const steps = [
  { n: '01', title: 'Create Your Account', desc: 'Register with your personal and disability information on the EqualAccess Portal.' },
  { n: '02', title: 'PDAO Verification', desc: 'Submit your PWD ID for review. PDAO staff will verify your account within 3–5 business days.' },
  { n: '03', title: 'Explore & Apply', desc: 'Browse benefits programs, apply for assistance, and view job recommendations matched to your profile.' },
  { n: '04', title: 'Track in Real Time', desc: 'Monitor your application status with a live timeline from submission to completion.' },
]

function SectionTag({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ea-teal-700 text-xs font-bold uppercase tracking-[0.18em] mb-3 bg-ea-teal-50/80 border border-ea-teal-100 px-3 py-1 rounded-full">
      {children}
    </span>
  )
}

export default function Landing({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-slate-50 font-sans overflow-x-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-gradient-to-r from-ea-teal-600 to-ea-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg">
        Skip to main content
      </a>

      {/* Gov banner */}
      <div className="bg-ea-teal-950 text-teal-200/90 text-[11px] py-1.5 text-center font-medium tracking-wide" role="banner">
        Official Digital Platform — Persons with Disabilities Affairs Office (PDAO), Los Baños, Laguna
      </div>

      {/* Navbar */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-white/60 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <EALogo />
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            {['Home', 'Benefits', 'About', 'Contact'].map((item) => (
              <a key={item} href="#" className="text-sm text-slate-500 hover:text-ea-teal-700 font-medium transition-colors">
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onNavigate('login')}>Log In</Button>
            <Button size="sm" onClick={() => onNavigate('register')}>Register</Button>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden bg-brand-glow py-20 lg:py-28" aria-labelledby="hero-heading">
          <div className="absolute inset-0 bg-decor-grid opacity-20" aria-hidden="true" />
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-teal-400/20 blur-3xl animate-blob" aria-hidden="true" />
          <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full bg-ea-blue-500/20 blur-3xl animate-blob-delayed" aria-hidden="true" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 glass-dark text-teal-100 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
                <Sparkles size={13} className="text-teal-300" />
                PDAO Los Baños — Official Platform
              </div>
              <h1 id="hero-heading" className="font-display text-4xl lg:text-[3.4rem] font-extrabold text-white leading-[1.08] tracking-tight mb-6">
                Equal Access to Government Benefits, Programs, and Opportunities
              </h1>
              <p className="text-teal-100/90 text-lg leading-relaxed mb-9 max-w-lg">
                Access government assistance, browse available programs, submit requests, and monitor your application through one centralized platform designed for Persons with Disabilities.
              </p>
              <div className="flex flex-wrap gap-3 mb-9">
                <button
                  onClick={() => onNavigate('register')}
                  className="inline-flex items-center gap-2 bg-white text-ea-teal-900 font-bold px-7 py-3.5 rounded-xl hover:bg-teal-50 active:scale-[0.98] transition-all text-sm shadow-xl shadow-black/20"
                >
                  Register Now <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => onNavigate('login')}
                  className="inline-flex items-center gap-2 glass-dark text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/15 active:scale-[0.98] transition-all text-sm"
                >
                  Explore Benefits
                </button>
              </div>
              <div className="flex flex-wrap gap-5 text-sm text-teal-100/90">
                {['Free to use', 'Secure & private', 'WCAG accessible', 'PDAO-verified'].map((f) => (
                  <span key={f} className="flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-teal-300" />{f}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — glass stat cluster */}
            <div className="relative hidden lg:block animate-fade-up" style={{ animationDelay: '120ms' }}>
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/20 glass-dark">
                <img
                  src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=420&fit=crop&auto=format"
                  alt="Diverse group of persons with disabilities using digital services"
                  className="w-full h-[340px] object-cover opacity-90"
                />
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-ea-teal-950/70 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-6 -left-6 glass-strong rounded-2xl p-4 shadow-xl animate-blob">
                <p className="font-display text-2xl font-extrabold text-gradient">212</p>
                <p className="text-xs text-slate-500 font-semibold">Registered PWDs</p>
              </div>
              <div className="absolute -top-6 -right-6 glass-strong rounded-2xl p-4 shadow-xl animate-blob-delayed">
                <p className="font-display text-2xl font-extrabold text-gradient">71%</p>
                <p className="text-xs text-slate-500 font-semibold">Approval Rate</p>
              </div>
              <div className="absolute bottom-10 right-6 bg-gradient-to-r from-ea-teal-500 to-ea-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-black/20">
                ✓ PDAO Official
              </div>
            </div>
          </div>
        </section>

        {/* Stats ticker */}
        <section className="relative bg-white/60 backdrop-blur-xl border-y border-white/60 py-6" aria-label="System statistics">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { v: '212', l: 'Registered PWDs' },
              { v: '6', l: 'Active Programs' },
              { v: '₱1.4M+', l: 'Benefits Distributed' },
              { v: '7', l: 'Barangays Served' },
            ].map((s) => (
              <div key={s.l} className="py-1">
                <p className="font-display text-2xl font-extrabold text-gradient">{s.v}</p>
                <p className="text-slate-500 text-xs font-semibold mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About the Portal */}
        <section className="py-20 px-4" aria-labelledby="about-heading">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-up">
              <SectionTag>About the Portal</SectionTag>
              <h2 id="about-heading" className="font-display text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight mb-5 tracking-tight">
                One Platform for All PWD Services in <span className="text-gradient">Los Baños</span>
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                The EqualAccess Portal is a thesis capstone project developed for the Persons with Disabilities Affairs Office (PDAO) of Los Baños, Laguna. It aims to centralize access to government benefits, streamline assistance requests, and connect PWDs with employment opportunities — all in one accessible, data-driven platform.
              </p>
              <p className="text-slate-600 leading-relaxed mb-7">
                Built in accordance with WCAG accessibility standards, the portal supports a wide range of disabilities and prioritizes ease of use for all users, including those with visual, hearing, physical, cognitive, and psychosocial disabilities.
              </p>
              <div className="flex gap-3">
                <Button size="lg" onClick={() => onNavigate('register')}>Get Started</Button>
                <Button variant="outline" size="lg" onClick={() => onNavigate('login')}>Sign In</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: '120ms' }}>
              {[
                { icon: <Shield size={20} className="text-ea-teal-600" />, title: 'Secure', desc: 'Your data is encrypted and protected under Philippine data privacy laws.' },
                { icon: <Clock size={20} className="text-ea-blue-600" />, title: '24/7 Access', desc: 'Access your dashboard and track requests anytime from any device.' },
                { icon: <Globe size={20} className="text-ea-teal-600" />, title: 'Accessible', desc: 'High contrast, large text, and screen reader support built in.' },
                { icon: <Award size={20} className="text-ea-blue-600" />, title: 'Official PDAO', desc: 'Operated and managed by the PDAO of Los Baños, Laguna.' },
              ].map((f) => (
                <div key={f.title} className="card-glass rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-white/50 border border-white/60 flex items-center justify-center mb-3 shadow-sm">
                    {f.icon}
                  </div>
                  <p className="font-display font-bold text-slate-900 text-sm mb-1">{f.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 px-4 bg-gradient-to-br from-ea-teal-50/50 via-white to-ea-blue-50/50" aria-labelledby="how-heading">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 animate-fade-up">
              <SectionTag>Process</SectionTag>
              <h2 id="how-heading" className="font-display text-3xl lg:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">How It Works</h2>
              <p className="text-slate-500 max-w-xl mx-auto">Four simple steps to access the government benefits and programs you deserve.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {steps.map((s, i) => (
                <div key={s.n} className="card-glass rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-lift transition-all duration-300 animate-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
                  <div className="absolute top-4 right-5 font-display text-5xl font-black text-slate-100 group-hover:text-ea-teal-50 transition-colors">{s.n}</div>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-ea-teal-500 to-ea-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-ea-teal-600/25 mb-4">{s.n}</div>
                  <h3 className="font-display font-bold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Button size="lg" onClick={() => onNavigate('register')}>Start Registration <ArrowRight size={16} /></Button>
            </div>
          </div>
        </section>

        {/* Featured Benefits */}
        <section className="py-20 px-4" aria-labelledby="benefits-heading">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 animate-fade-up">
              <SectionTag>Programs</SectionTag>
              <h2 id="benefits-heading" className="font-display text-3xl lg:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Featured Benefits & Programs</h2>
              <p className="text-slate-500 max-w-xl mx-auto">PDAO Los Baños offers a comprehensive range of programs and services for PWDs.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {benefitCategories.map((b) => (
                <div key={b.title} className="card-glass rounded-2xl p-5 flex gap-4 hover:-translate-y-1 hover:shadow-lift transition-all duration-300 group cursor-pointer animate-fade-up">
                  <div className={`w-11 h-11 bg-gradient-to-br ${b.tint} rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-inset ring-white/70 group-hover:scale-110 transition-transform`}>
                    {b.icon}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900 mb-1 text-sm group-hover:text-ea-teal-700 transition-colors">{b.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Button variant="outline" size="lg" onClick={() => onNavigate('login')}>View All Programs <ArrowRight size={16} /></Button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4" aria-labelledby="faq-heading">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12 animate-fade-up">
              <SectionTag>FAQ</SectionTag>
              <h2 id="faq-heading" className="font-display text-3xl lg:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Frequently Asked Questions</h2>
              <p className="text-slate-500">Common questions about the EqualAccess Portal and PDAO services.</p>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="card-glass rounded-2xl overflow-hidden animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                    className="w-full flex items-center justify-between p-5 text-left font-semibold text-slate-900 hover:bg-white/50 transition-colors text-sm"
                  >
                    {faq.q}
                    <ChevronDown size={17} className={`text-slate-400 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180 text-ea-teal-600' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-white/60 pt-3 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-16 px-4" aria-labelledby="contact-heading">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 animate-fade-up">
              <SectionTag>Contact</SectionTag>
              <h2 id="contact-heading" className="font-display text-2xl lg:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Contact the PDAO</h2>
              <p className="text-slate-500 text-sm">The Persons with Disabilities Affairs Office is here to help you.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {[
                { icon: <Phone size={18} />, label: 'Hotline', value: '+63 49 536 0050', sub: 'Mon–Fri, 8 AM–5 PM' },
                { icon: <Mail size={18} />, label: 'Email', value: 'pdao@losbanos.gov.ph', sub: 'Response within 2 business days' },
                { icon: <MapPin size={18} />, label: 'Office', value: 'Los Baños Municipal Hall, Laguna', sub: 'PDAO Office, Ground Floor' },
              ].map((c) => (
                <div key={c.label} className="card-glass rounded-2xl p-5 flex gap-4 hover:-translate-y-1 transition-all duration-300 animate-fade-up">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ea-teal-50 to-ea-blue-50 border border-ea-teal-100 flex items-center justify-center text-ea-teal-600 shrink-0 shadow-sm">{c.icon}</div>
                  <div>
                    <p className="text-[11px] font-bold text-ea-teal-700 uppercase tracking-wide mb-0.5">{c.label}</p>
                    <p className="font-semibold text-slate-900 text-sm">{c.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4" aria-labelledby="cta-heading">
          <div className="max-w-5xl mx-auto bg-brand-glow rounded-3xl px-6 py-14 text-center relative overflow-hidden animate-fade-up">
            <div className="absolute inset-0 bg-decor-grid opacity-15" aria-hidden="true" />
            <div className="absolute -top-20 right-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 id="cta-heading" className="font-display text-3xl lg:text-4xl font-extrabold text-white mb-4 tracking-tight">Ready to Access Your Benefits?</h2>
              <p className="text-teal-100/90 text-lg mb-9 max-w-2xl mx-auto">
                Join 212+ PWDs in Los Baños who are already using the EqualAccess Portal to access government assistance. Registration is free and takes less than 10 minutes.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => onNavigate('register')}
                  className="inline-flex items-center gap-2 bg-white text-ea-teal-900 font-bold px-7 py-3.5 rounded-xl hover:bg-teal-50 active:scale-[0.98] transition-all shadow-xl shadow-black/20"
                >
                  Register Now — It's Free <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => onNavigate('login')}
                  className="inline-flex items-center gap-2 glass-dark text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/15 active:scale-[0.98] transition-all"
                >
                  I Already Have an Account
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Accessibility Statement */}
        <section className="py-6 px-4 bg-ea-teal-50/70 border-y border-ea-teal-100/70" aria-labelledby="a11y-heading">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-white border border-ea-teal-100 flex items-center justify-center text-ea-teal-600 shrink-0 shadow-sm"><Accessibility size={22} /></div>
            <div>
              <p id="a11y-heading" className="text-sm font-bold text-ea-teal-900">Accessibility Commitment</p>
              <p className="text-xs text-ea-teal-700">The EqualAccess Portal is designed to comply with WCAG 2.1 Level AA guidelines. We are committed to making digital services inclusive for all Persons with Disabilities. If you encounter any accessibility issues, please <a href="#" className="underline font-semibold">contact us</a>.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-4" role="contentinfo">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ea-teal-500 to-ea-blue-600 flex items-center justify-center">
                  <span className="text-white font-black text-xs font-display">EA</span>
                </div>
                <p className="text-white font-bold text-sm font-display">EqualAccess Portal</p>
              </div>
              <p className="text-xs leading-relaxed">Official digital platform of the PDAO of Los Baños, Laguna for PWD benefit management and assistance services.</p>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Quick Links</p>
              <ul className="space-y-2 text-xs">
                {['Benefits & Programs', 'Assistance Request', 'About the Portal'].map((l) => (
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
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <p>© 2024 Municipality of Los Baños — PDAO. All rights reserved.</p>
            <p>EqualAccess Portal — A Capstone Thesis Project</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
