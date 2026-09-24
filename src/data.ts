import type { DisabilityType, EmploymentType, WorkArrangement, JobStatus } from './lib/catalog'
import { mldatasetJobs } from './mldatasetJobs'

export type { DisabilityType, EmploymentType, WorkArrangement, JobStatus }

export type VerificationStatus = 'Verified' | 'Pending' | 'Rejected' | 'Unverified'
export type RequestStatus = 'Pending' | 'Under Review' | 'Requirements Needed' | 'Approved' | 'Rejected' | 'Available' | 'Claimed' | 'Completed'
export type BenefitCategory =
  | 'Financial Assistance'
  | 'Medical Assistance'
  | 'Assistive Devices'
  | 'Educational Assistance'
  | 'Livelihood Programs'
  | 'Social Services'
  | 'Employment'
  | 'Other Support Services'

export type BenefitStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Active' | 'Closed'

export interface PWDUser {
  id: string
  username: string
  password: string
  name: string
  address: string
  barangay: string
  age?: number
  contact: string
  email: string
  disabilityType: DisabilityType
  verificationStatus: VerificationStatus
  dateRegistered: string
  pwdIdNumber: string
  avatar?: string
  active?: boolean
  /** Soft-delete marker (ISO date). Deleted records are excluded from every count. */
  deletedAt?: string

  // Employment / recommendation profile
  skills?: string[]
  /** Highest education level - one of EDUCATION_LEVELS (src/lib/catalog.ts). */
  educationLevel?: string
  /** Free-text course/degree detail; used to infer a level when educationLevel is empty. */
  education?: string
  workExperience?: string
  yearsOfExperience?: number
  certifications?: string[]
  jobInterests?: string[]
  preferredJobTypes?: EmploymentType[]
  preferredWorkSetup?: WorkArrangement[]
  preferredLocation?: string
  functionalCapabilities?: string[]
  accessibilityNeeds?: string[]
  /** Optional accommodation needs (canonical ACCOMMODATIONS labels plus free text). */
  accommodationRequirements?: string[]
  savedJobIds?: string[]
}

export interface Benefit {
  id: string
  name: string
  category: BenefitCategory
  description: string
  eligibility: string
  barangay: string
  applicationDeadline: string
  date: string
  time: string
  status: BenefitStatus
  requirements: string[]
  benefits: string[]
  contactPerson: string
  contactNumber: string
}

export interface AssistanceRequest {
  id: string
  pwdName: string
  pwdId: string
  type: string
  title: string
  description: string
  dateSubmitted: string
  lastUpdated: string
  status: RequestStatus
  assignedStaff: string
  comments: { author: string; date: string; message: string }[]
  timeline: { step: string; date: string; completed: boolean; active: boolean }[]
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  date: string
  read: boolean
  userId?: string
}

export interface Job {
  id: string
  title: string
  /** Employer / company name. */
  company: string
  description: string
  /** Barangay ("Brgy. X") or municipality ("Los Baños, Laguna"). */
  location: string
  employmentType: EmploymentType
  workArrangement: WorkArrangement
  /** Required skills. */
  skills: string[]
  /** Minimum education level (an EDUCATION_LEVELS label) or '' for none. */
  minEducation: string
  /** Empty = open to all disability types. Only set when the employer explicitly restricts the listing. */
  suitableDisabilities: string[]
  /** Accommodations the employer offers (canonical ACCOMMODATIONS labels). */
  accommodations: string[]
  slots: number
  deadline: string
  status: JobStatus
  postedDate: string
  salary?: string
  category?: string
  accessibilityInfo?: string
}

export interface AdminUser {
  id: string
  name: string
  position: string
  username: string
  password: string
  contact?: string
  email?: string
  role: 'Administrator' | 'Benefits Officer' | 'Social Worker' | 'Records Officer'
  status: 'Active' | 'Inactive'
  lastLogin: string
  dateCreated: string
}

export interface FeedbackTicket {
  id: string
  pwdName: string
  isAnonymous: boolean
  subject: string
  category: 'Question' | 'Complaint' | 'Report' | 'Feedback'
  message: string
  dateSubmitted: string
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed'
  assignedStaff: string
  responses: { author: string; date: string; message: string; isInternal?: boolean }[]
  userId?: string
}

// ── SAMPLE DATA ──────────────────────────────────────────────────

export const currentUser: PWDUser = {
  id: 'PWD-LB-2024-0042',
  username: 'maria.reyes',
  password: 'pwd123',
  name: 'Maria Santos Reyes',
  address: '142 Pili Drive, Malinta',
  barangay: 'Brgy. Malinta',
  contact: '+63 912 345 6789',
  email: 'jadesupremo0@gmail.com',
  disabilityType: 'Visual Disability',
  verificationStatus: 'Verified',
  dateRegistered: '2024-01-15',
  pwdIdNumber: 'LB-VIS-2023-00421',
  age: 28,
  avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&h=80&fit=crop&auto=format',
  skills: ['Data Entry', 'Microsoft Office', 'Computer Literacy', 'Communication', 'Customer Service'],
  education: 'Bachelor of Science in Information Technology',
    educationLevel: 'College Graduate',
  workExperience: 'Computer Technician Intern at a local IT services shop',
  yearsOfExperience: 1,
  certifications: ['TESDA Computer Systems Servicing NC II', 'Microsoft Office Specialist'],
  jobInterests: ['Data Entry', 'IT Support', 'Administrative Assistant'],
  preferredJobTypes: ['Full-time', 'Part-time'],
  preferredWorkSetup: ['On-site', 'Remote'],
  preferredLocation: 'Los Baños, Laguna',
  functionalCapabilities: ['Computer-based tasks', 'Seated work', 'Verbal communication', 'Use standard computer applications', 'Read with assistive technology'],
  accessibilityNeeds: ['Accessible entrance', 'Screen reader compatible software'],
  accommodationRequirements: ['Screen-reader-compatible tools', 'Assistive technology provided'],
}

export const pwdUsers: PWDUser[] = [
  currentUser,
  {
    id: 'PWD-LB-2024-0043',
    username: 'juan.delacruz',
    password: 'pwd123',
    name: 'Juan dela Cruz',
    address: '78 Malvar St., Batong Malake',
    barangay: 'Brgy. Batong Malake',
    contact: '+63 917 234 5678',
    email: 'juan.delacruz@email.com',
    disabilityType: 'Physical Disability',
    verificationStatus: 'Verified',
    dateRegistered: '2024-01-22',
    pwdIdNumber: 'LB-PHY-2023-00312',
    age: 34,
    skills: ['Administration', 'Typing', 'MS Office', 'Data Entry', 'Computer Literacy'],
    education: 'Bachelor of Science in Public Administration',
    educationLevel: 'College Graduate',
    workExperience: 'Barangay secretary assistant (records and encoding)',
    yearsOfExperience: 2,
    certifications: ['TESDA Computer Hardware Servicing NC II'],
jobInterests: ['Administrative Assistant', 'Records Clerk', 'Data Encoder'],
  preferredJobTypes: ['Full-time'],
  preferredWorkSetup: ['On-site'],
  preferredLocation: 'Los Baños, Laguna',
  functionalCapabilities: ['Computer-based tasks', 'Seated work', 'Verbal communication', 'Use standard computer applications'],
    accessibilityNeeds: ['Wheelchair accessible entrance', 'Accessible restroom', 'Elevator access'],
    accommodationRequirements: ['Wheelchair-accessible workplace'],
  },
  {
    id: 'PWD-LB-2024-0044',
    username: 'ana.macaraeg',
    password: 'pwd123',
    name: 'Ana Macaraeg',
    address: '33 Rizal Ave., Putho-Tuntungin',
    barangay: 'Brgy. Putho-Tuntungin',
    contact: '+63 920 345 6789',
    email: 'ana.macaraeg@email.com',
    disabilityType: 'Deaf or Hard of Hearing',
    verificationStatus: 'Pending',
    dateRegistered: '2024-02-05',
    pwdIdNumber: 'LB-HEA-2024-00018',
    age: 25,
    skills: ['Writing', 'Design', 'Social Media', 'Photography'],
    education: 'Bachelor of Fine Arts',
    educationLevel: 'College Graduate',
    workExperience: 'Freelance graphic designer for student organizations',
    yearsOfExperience: 1,
    certifications: ['TESDA Visual Graphics Design NC III'],
    jobInterests: ['Graphic Designer', 'Social Media Assistant', 'Content Writer'],
    preferredJobTypes: ['Part-time', 'Full-time'],
    preferredWorkSetup: ['Hybrid', 'Remote'],
    functionalCapabilities: ['Computer-based tasks', 'Seated work', 'Visual communication', 'Use design software'],
    accessibilityNeeds: ['Sign language interpretation', 'Visual alert systems'],
    accommodationRequirements: ['Sign-language interpreter', 'Written instructions'],
  },
  {
    id: 'PWD-LB-2024-0045',
    username: 'roberto.v',
    password: 'pwd123',
    name: 'Roberto Villanueva',
    address: '210 Bonifacio Ave., Bayog',
    barangay: 'Brgy. Bayog',
    contact: '+63 918 456 7890',
    email: 'roberto.v@email.com',
    disabilityType: 'Mental Disability',
    verificationStatus: 'Verified',
    dateRegistered: '2024-02-14',
    pwdIdNumber: 'LB-MEN-2023-00156',
    age: 31,
    skills: ['Horticulture', 'Manual Labor', 'Carpentry', 'Plant Care'],
    education: 'High School Graduate',
    educationLevel: 'High School Graduate',
    workExperience: 'Farm helper and landscape maintenance worker',
    yearsOfExperience: 4,
    certifications: ['TESDA Organic Agriculture Production NC II'],
    jobInterests: ['Gardener', 'Grounds Maintenance', 'Farm Worker'],
    preferredJobTypes: ['Full-time'],
    preferredWorkSetup: ['On-site'],
    functionalCapabilities: ['Outdoor physical work', 'Lifting moderate loads', 'Manual tasks', 'Seated work'],
    accessibilityNeeds: [],
    accommodationRequirements: ['Written instructions', 'Flexible hours'],
  },
  {
    id: 'PWD-LB-2024-0046',
    username: 'liza.corpuz',
    password: 'pwd123',
    name: 'Liza Corpuz',
    address: '55 Tiongco St., Anos',
    barangay: 'Brgy. Anos',
    contact: '+63 919 567 8901',
    email: 'liza.corpuz@email.com',
    disabilityType: 'Cancer (RA 11215)',
    verificationStatus: 'Rejected',
    dateRegistered: '2024-02-28',
    pwdIdNumber: 'LB-CAN-2024-00007',
    age: 45,
    skills: ['Cooking', 'Baking', 'Food Processing', 'Food Safety'],
    education: 'Vocational — Hotel and Restaurant Services',
    educationLevel: 'Vocational',
    workExperience: 'Kitchen helper and food stall operator',
    yearsOfExperience: 3,
    certifications: ['TESDA Food and Beverage Services NC II'],
    jobInterests: ['Food Service Assistant', 'Bakeshop Helper', 'Kitchen Staff'],
    preferredJobTypes: ['Part-time'],
    preferredWorkSetup: ['On-site'],
    functionalCapabilities: ['Standing work for short periods', 'Manual tasks', 'Seated work'],
    accessibilityNeeds: [],
    accommodationRequirements: ['Flexible hours'],
  },
  {
    id: 'PWD-LB-2024-0047',
    username: 'felix.abad',
    password: 'pwd123',
    name: 'Felix Abad',
    address: '99 Diokno St., Maahas',
    barangay: 'Brgy. Maahas',
    contact: '+63 916 678 9012',
    email: 'felix.abad@email.com',
    disabilityType: 'Learning Disability',
    verificationStatus: 'Pending',
    dateRegistered: '2024-03-10',
    pwdIdNumber: 'LB-LEA-2024-00043',
    age: 22,
    skills: ['Photography', 'Videography', 'Social Media', 'Video Editing'],
    education: 'Senior High School Graduate',
    educationLevel: 'Senior High School Graduate',
    workExperience: 'Event photo and video coverage assistant',
    yearsOfExperience: 1,
    certifications: ['TESDA Visual Graphics Design NC II'],
    jobInterests: ['Photographer', 'Video Editor', 'Social Media Assistant'],
    preferredJobTypes: ['Part-time', 'Contractual'],
    preferredWorkSetup: ['Remote', 'On-site'],
    functionalCapabilities: ['Computer-based tasks', 'Seated work', 'Use photo and video equipment', 'Visual communication'],
    accessibilityNeeds: [],
    accommodationRequirements: ['Written instructions'],
  },
  {
    id: 'PWD-LB-2024-0048',
    username: 'carmelita.flores',
    password: 'pwd123',
    name: 'Carmelita Flores',
    address: '12 Pili Drive, Bagong Kalsada',
    barangay: 'Brgy. Bagong Kalsada',
    contact: '+63 915 789 0123',
    email: 'carmelita.flores@email.com',
    disabilityType: 'Psychosocial Disability',
    verificationStatus: 'Verified',
    dateRegistered: '2024-03-15',
    pwdIdNumber: 'LB-PSY-2024-00029',
    age: 29,
    skills: ['Customer Service', 'English Proficiency', 'Communication', 'Typing'],
    education: 'Bachelor of Arts in Communication',
    educationLevel: 'College Graduate',
    workExperience: 'Call center customer support trainee',
    yearsOfExperience: 1,
    certifications: [],
    jobInterests: ['Customer Service Representative', 'Call Center Agent', 'Receptionist'],
    preferredJobTypes: ['Full-time', 'Part-time'],
    preferredWorkSetup: ['On-site', 'Remote'],
    functionalCapabilities: ['Computer-based tasks', 'Seated work', 'Verbal communication', 'Use standard computer applications'],
    accessibilityNeeds: [],
    accommodationRequirements: ['Quiet workspace', 'Flexible hours'],
  },
]

export const benefits: Benefit[] = [
  {
    id: 'BEN-001',
    name: 'Monthly Cash Assistance Program',
    category: 'Financial Assistance',
    description: 'Monthly financial assistance of ₱500 to eligible PWDs of Los Baños to cover daily living expenses.',
    eligibility: 'Verified PWDs aged 18–59 with annual family income below ₱100,000',
    barangay: 'All Barangays',
    applicationDeadline: '2024-04-30',
    date: '2024-04-01',
    time: '8:00 AM – 5:00 PM',
    status: 'Active',
    requirements: ['Valid PWD ID', 'Barangay Certificate', 'Proof of Income', 'Birth Certificate'],
    benefits: ['₱500 monthly cash assistance', 'Priority processing at LGU offices'],
    contactPerson: 'Ma. Carmen Santos',
    contactNumber: '+63 49 536 0050',
  },
  {
    id: 'BEN-002',
    name: 'Wheelchair and Assistive Devices Distribution',
    category: 'Assistive Devices',
    description: 'Free distribution of wheelchairs, crutches, canes, and other assistive devices for qualified PWDs of Los Baños.',
    eligibility: 'PWDs with mobility impairment, verified and registered with PDAO',
    barangay: 'Brgy. Malinta, Brgy. Batong Malake, Brgy. Bayog',
    applicationDeadline: '2024-03-31',
    date: '2024-03-20',
    time: '9:00 AM – 3:00 PM',
    status: 'Pending Approval',
    requirements: ['PWD ID', 'Medical Certificate', 'Referral Letter from Social Worker'],
    benefits: ['Free wheelchair or assistive device', 'Free fitting and orientation'],
    contactPerson: 'Ronaldo Agustin',
    contactNumber: '+63 49 536 0051',
  },
  {
    id: 'BEN-003',
    name: 'PDAO Educational Scholarship Grant',
    category: 'Educational Assistance',
    description: 'Full tuition assistance and monthly stipend for PWD students enrolled in UPLB and other accredited schools in Los Baños.',
    eligibility: 'PWD students enrolled in college or vocational course with a GWA of 2.5 or better',
    barangay: 'All Barangays',
    applicationDeadline: '2024-05-15',
    date: '2024-05-01',
    time: '8:00 AM – 12:00 PM',
    status: 'Active',
    requirements: ['PWD ID', 'Certificate of Enrollment', 'Grades/Transcript', 'School ID'],
    benefits: ['Full tuition coverage', '₱2,000 monthly stipend', 'Books and supplies allowance'],
    contactPerson: 'Janine Pascual',
    contactNumber: '+63 49 536 0052',
  },
  {
    id: 'BEN-004',
    name: 'Medical Assistance Program',
    category: 'Medical Assistance',
    description: 'Financial assistance for hospital bills, medicines, and medical procedures for PWDs at Bay General Hospital and other LGU-partner hospitals.',
    eligibility: 'All verified PWDs of Los Baños with medical needs',
    barangay: 'All Barangays',
    applicationDeadline: '2024-12-31',
    date: '2024-01-01',
    time: '8:00 AM – 5:00 PM',
    status: 'Active',
    requirements: ['PWD ID', 'Hospital Bill', 'Medical Certificate', 'Prescription'],
    benefits: ['Up to ₱10,000 hospital bill assistance', 'Free medicines for maintenance'],
    contactPerson: 'Ma. Carmen Santos',
    contactNumber: '+63 49 536 0050',
  },
  {
    id: 'BEN-005',
    name: 'Livelihood Skills Training — Agri-Entrepreneurship',
    category: 'Livelihood Programs',
    description: 'Free skills training in urban gardening, food processing, handicrafts, and computer literacy leveraging Los Baños\'s agricultural heritage.',
    eligibility: 'PWDs aged 18 and above, verified with PDAO',
    barangay: 'Brgy. Bayog, Brgy. Anos, Brgy. Maahas',
    applicationDeadline: '2024-04-10',
    date: '2024-04-15',
    time: '8:00 AM – 4:00 PM',
    status: 'Approved',
    requirements: ['PWD ID', 'Barangay Certificate', '2x2 Photo'],
    benefits: ['Free training', 'Certificate of completion', 'Starter kit worth ₱3,000'],
    contactPerson: 'Ronaldo Agustin',
    contactNumber: '+63 49 536 0051',
  },
  {
    id: 'BEN-006',
    name: 'PWD Senior Citizen Combined Allowance',
    category: 'Financial Assistance',
    description: 'Monthly allowance for senior citizens who are also PWDs, combining LGU-PDAO benefits.',
    eligibility: 'PWDs aged 60 and above with valid PWD ID and Senior Citizen ID',
    barangay: 'All Barangays',
    applicationDeadline: '2024-12-31',
    date: '2024-01-01',
    time: '8:00 AM – 5:00 PM',
    status: 'Active',
    requirements: ['PWD ID', 'Senior Citizen ID', 'Barangay Certificate'],
    benefits: ['₱1,000 monthly allowance', 'Priority healthcare access'],
    contactPerson: 'Janine Pascual',
    contactNumber: '+63 49 536 0052',
  },
]

export const assistanceRequests: AssistanceRequest[] = [
  // ── Felix Abad (PWD-LB-2024-0047) ───────────────────────────────
  {
    id: 'REQ-LB-2024-009',
    pwdName: 'Felix Abad',
    pwdId: 'PWD-LB-2024-0047',
    type: 'Financial Assistance',
    title: 'Monthly Living Assistance Request',
    description: 'Requesting monthly financial support to cover basic expenses while managing my learning disability and preparing for employment.',
    dateSubmitted: '2024-03-01',
    lastUpdated: '2024-03-03',
    status: 'Pending',
    assignedStaff: 'Unassigned',
    comments: [],
    timeline: [
      { step: 'Submitted', date: '2024-03-01', completed: true, active: true },
      { step: 'Under Review', date: '', completed: false, active: false },
      { step: 'Requirements Needed', date: '', completed: false, active: false },
      { step: 'Approved / Rejected', date: '', completed: false, active: false },
      { step: 'Processing', date: '', completed: false, active: false },
      { step: 'Completed', date: '', completed: false, active: false },
    ],
  },
  {
    id: 'REQ-LB-2024-010',
    pwdName: 'Felix Abad',
    pwdId: 'PWD-LB-2024-0047',
    type: 'Livelihood Training',
    title: 'Photography & Digital Content Training',
    description: 'Requesting enrollment in the digital skills livelihood program to build on my photography and content creation skills.',
    dateSubmitted: '2024-02-15',
    lastUpdated: '2024-02-20',
    status: 'Under Review',
    assignedStaff: 'Ronaldo Agustin',
    comments: [
      { author: 'Ronaldo Agustin', date: '2024-02-20', message: 'Application under review. Please prepare your Barangay Certificate and 2x2 ID photos.' },
    ],
    timeline: [
      { step: 'Submitted', date: '2024-02-15', completed: true, active: false },
      { step: 'Under Review', date: '2024-02-20', completed: true, active: true },
      { step: 'Requirements Needed', date: '', completed: false, active: false },
      { step: 'Approved / Rejected', date: '', completed: false, active: false },
      { step: 'Processing', date: '', completed: false, active: false },
      { step: 'Completed', date: '', completed: false, active: false },
    ],
  },
  // ── Carmelita Flores (PWD-LB-2024-0048) ─────────────────────────
  {
    id: 'REQ-LB-2024-011',
    pwdName: 'Carmelita Flores',
    pwdId: 'PWD-LB-2024-0048',
    type: 'Medical Assistance',
    title: 'Mental Health Therapy Sessions',
    description: 'Requesting financial assistance to cover the cost of bi-weekly therapy sessions for psychosocial disability management.',
    dateSubmitted: '2024-02-25',
    lastUpdated: '2024-03-01',
    status: 'Approved',
    assignedStaff: 'Ma. Carmen Santos',
    comments: [
      { author: 'Ma. Carmen Santos', date: '2024-03-01', message: 'Approved. Voucher for 8 therapy sessions at Bay General Hospital is ready for pickup at the PDAO office.' },
    ],
    timeline: [
      { step: 'Submitted', date: '2024-02-25', completed: true, active: false },
      { step: 'Under Review', date: '2024-02-27', completed: true, active: false },
      { step: 'Requirements Needed', date: '2024-02-28', completed: true, active: false },
      { step: 'Approved / Rejected', date: '2024-03-01', completed: true, active: false },
      { step: 'Processing', date: '2024-03-01', completed: true, active: true },
      { step: 'Completed', date: '', completed: false, active: false },
    ],
  },
  {
    id: 'REQ-LB-2024-012',
    pwdName: 'Carmelita Flores',
    pwdId: 'PWD-LB-2024-0048',
    type: 'Educational Assistance',
    title: 'Online Course Scholarship — Customer Service',
    description: 'Requesting scholarship for an online Customer Service professional certificate course to improve employment prospects.',
    dateSubmitted: '2024-01-30',
    lastUpdated: '2024-02-10',
    status: 'Completed',
    assignedStaff: 'Janine Pascual',
    comments: [
      { author: 'Janine Pascual', date: '2024-02-10', message: 'Scholarship granted. Course enrollment fee paid directly to the training provider. Certificate expected in 3 months.' },
    ],
    timeline: [
      { step: 'Submitted', date: '2024-01-30', completed: true, active: false },
      { step: 'Under Review', date: '2024-02-01', completed: true, active: false },
      { step: 'Requirements Needed', date: '2024-02-03', completed: true, active: false },
      { step: 'Approved / Rejected', date: '2024-02-07', completed: true, active: false },
      { step: 'Processing', date: '2024-02-09', completed: true, active: false },
      { step: 'Completed', date: '2024-02-10', completed: true, active: false },
    ],
  },
  // ── Liza Corpuz (PWD-LB-2024-0046) ──────────────────────────────
  {
    id: 'REQ-LB-2024-007',
    pwdName: 'Liza Corpuz',
    pwdId: 'PWD-LB-2024-0046',
    type: 'Medical Assistance',
    title: 'Monthly Maintenance Medication Assistance',
    description: 'Requesting monthly assistance for maintenance medication for chronic illness (diabetes and hypertension).',
    dateSubmitted: '2024-02-05',
    lastUpdated: '2024-02-12',
    status: 'Requirements Needed',
    assignedStaff: 'Ma. Carmen Santos',
    comments: [
      { author: 'Ma. Carmen Santos', date: '2024-02-12', message: 'Please submit a recent medical certificate from your attending physician and three months of prescription receipts to proceed.' },
    ],
    timeline: [
      { step: 'Submitted', date: '2024-02-05', completed: true, active: false },
      { step: 'Under Review', date: '2024-02-08', completed: true, active: false },
      { step: 'Requirements Needed', date: '2024-02-12', completed: true, active: true },
      { step: 'Approved / Rejected', date: '', completed: false, active: false },
      { step: 'Processing', date: '', completed: false, active: false },
      { step: 'Completed', date: '', completed: false, active: false },
    ],
  },
  {
    id: 'REQ-LB-2024-008',
    pwdName: 'Liza Corpuz',
    pwdId: 'PWD-LB-2024-0046',
    type: 'Financial Assistance',
    title: 'Emergency Financial Aid — Hospitalization',
    description: 'Emergency request for financial assistance after unexpected hospitalization at Bay General Hospital due to complications.',
    dateSubmitted: '2024-01-15',
    lastUpdated: '2024-01-22',
    status: 'Rejected',
    assignedStaff: 'Ronaldo Agustin',
    comments: [
      { author: 'Ronaldo Agustin', date: '2024-01-22', message: 'Unfortunately your account verification is still pending, which is required before emergency assistance can be released. Please update your PWD ID documents and complete verification first.' },
    ],
    timeline: [
      { step: 'Submitted', date: '2024-01-15', completed: true, active: false },
      { step: 'Under Review', date: '2024-01-17', completed: true, active: false },
      { step: 'Requirements Needed', date: '2024-01-18', completed: true, active: false },
      { step: 'Approved / Rejected', date: '2024-01-22', completed: true, active: false },
      { step: 'Processing', date: '', completed: false, active: false },
      { step: 'Completed', date: '', completed: false, active: false },
    ],
  },
  // ── Original requests ────────────────────────────────────────────
  {
    id: 'REQ-LB-2024-001',
    pwdName: 'Maria Santos Reyes',
    pwdId: 'PWD-LB-2024-0042',
    type: 'Financial Assistance',
    title: 'Monthly Living Allowance Request',
    description: 'Requesting financial assistance to cover daily living expenses due to visual impairment limiting employment opportunities.',
    dateSubmitted: '2024-02-10',
    lastUpdated: '2024-02-15',
    status: 'Under Review',
    assignedStaff: 'Ronaldo Agustin',
    comments: [
      { author: 'Ronaldo Agustin', date: '2024-02-15', message: 'Your request has been received and is now under review. We may require additional documents. Please monitor your notifications.' },
    ],
    timeline: [
      { step: 'Submitted', date: '2024-02-10', completed: true, active: false },
      { step: 'Under Review', date: '2024-02-15', completed: true, active: true },
      { step: 'Requirements Needed', date: '', completed: false, active: false },
      { step: 'Approved / Rejected', date: '', completed: false, active: false },
      { step: 'Processing', date: '', completed: false, active: false },
      { step: 'Completed', date: '', completed: false, active: false },
    ],
  },
  {
    id: 'REQ-LB-2024-002',
    pwdName: 'Maria Santos Reyes',
    pwdId: 'PWD-LB-2024-0042',
    type: 'Medical Assistance',
    title: 'Eye Examination and Eyeglasses Assistance',
    description: 'Requesting assistance for comprehensive eye examination and prescription eyeglasses.',
    dateSubmitted: '2024-01-20',
    lastUpdated: '2024-02-01',
    status: 'Approved',
    assignedStaff: 'Ma. Carmen Santos',
    comments: [
      { author: 'Ma. Carmen Santos', date: '2024-01-25', message: 'Request approved. Please visit the PDAO office to claim your assistance voucher.' },
    ],
    timeline: [
      { step: 'Submitted', date: '2024-01-20', completed: true, active: false },
      { step: 'Under Review', date: '2024-01-22', completed: true, active: false },
      { step: 'Requirements Needed', date: '2024-01-24', completed: true, active: false },
      { step: 'Approved / Rejected', date: '2024-01-25', completed: true, active: false },
      { step: 'Processing', date: '2024-02-01', completed: true, active: true },
      { step: 'Completed', date: '', completed: false, active: false },
    ],
  },
  {
    id: 'REQ-LB-2024-003',
    pwdName: 'Juan dela Cruz',
    pwdId: 'PWD-LB-2024-0043',
    type: 'Assistive Device',
    title: 'Wheelchair Request',
    description: 'Requesting a standard wheelchair due to mobility impairment.',
    dateSubmitted: '2024-02-18',
    lastUpdated: '2024-02-20',
    status: 'Pending',
    assignedStaff: 'Unassigned',
    comments: [],
    timeline: [
      { step: 'Submitted', date: '2024-02-18', completed: true, active: true },
      { step: 'Under Review', date: '', completed: false, active: false },
      { step: 'Requirements Needed', date: '', completed: false, active: false },
      { step: 'Approved / Rejected', date: '', completed: false, active: false },
      { step: 'Processing', date: '', completed: false, active: false },
      { step: 'Completed', date: '', completed: false, active: false },
    ],
  },
  {
    id: 'REQ-LB-2024-004',
    pwdName: 'Ana Macaraeg',
    pwdId: 'PWD-LB-2024-0044',
    type: 'Educational Assistance',
    title: 'PDAO Scholarship Application — AY 2024-2025',
    description: 'Applying for PDAO educational scholarship. Currently enrolled in BS Information Technology at UPLB.',
    dateSubmitted: '2024-01-08',
    lastUpdated: '2024-01-30',
    status: 'Completed',
    assignedStaff: 'Janine Pascual',
    comments: [
      { author: 'Janine Pascual', date: '2024-01-30', message: 'Scholarship approved and tuition paid directly to UPLB. Monthly stipend will be released starting February.' },
    ],
    timeline: [
      { step: 'Submitted', date: '2024-01-08', completed: true, active: false },
      { step: 'Under Review', date: '2024-01-10', completed: true, active: false },
      { step: 'Requirements Needed', date: '2024-01-15', completed: true, active: false },
      { step: 'Approved / Rejected', date: '2024-01-22', completed: true, active: false },
      { step: 'Processing', date: '2024-01-25', completed: true, active: false },
      { step: 'Completed', date: '2024-01-30', completed: true, active: false },
    ],
  },
  {
    id: 'REQ-LB-2024-005',
    pwdName: 'Roberto Villanueva',
    pwdId: 'PWD-LB-2024-0045',
    type: 'Livelihood Training',
    title: 'Agri-Entrepreneurship Training Enrollment',
    description: 'Requesting enrollment in the Agri-Entrepreneurship Skills Training Program.',
    dateSubmitted: '2024-02-22',
    lastUpdated: '2024-02-25',
    status: 'Rejected',
    assignedStaff: 'Ronaldo Agustin',
    comments: [
      { author: 'Ronaldo Agustin', date: '2024-02-25', message: 'Training slots are currently full. You have been added to the waitlist for the next batch in June 2024.' },
    ],
    timeline: [
      { step: 'Submitted', date: '2024-02-22', completed: true, active: false },
      { step: 'Under Review', date: '2024-02-23', completed: true, active: false },
      { step: 'Requirements Needed', date: '2024-02-24', completed: true, active: false },
      { step: 'Approved / Rejected', date: '2024-02-25', completed: true, active: false },
      { step: 'Processing', date: '', completed: false, active: false },
      { step: 'Completed', date: '', completed: false, active: false },
    ],
  },
]

export const notifications: Notification[] = [
  {
    id: 'NOT-001',
    type: 'success',
    title: 'Account Verified by PDAO',
    message: 'Your EqualAccess Portal account has been verified. You now have full access to all benefits and programs.',
    date: '2024-01-16',
    read: false,
  },
  {
    id: 'NOT-002',
    type: 'info',
    title: 'New Program: Agri-Entrepreneurship Training',
    message: 'PDAO is now accepting applications for the Agri-Entrepreneurship Skills Training. Deadline: April 10, 2024.',
    date: '2024-02-28',
    read: false,
  },
  {
    id: 'NOT-003',
    type: 'success',
    title: 'Request Approved — Medical Assistance',
    message: 'Your request REQ-LB-2024-002 for Eye Examination and Eyeglasses Assistance has been approved.',
    date: '2024-01-25',
    read: true,
  },
  {
    id: 'NOT-004',
    type: 'warning',
    title: 'Documents Required for Your Request',
    message: 'Request REQ-LB-2024-001 requires a Barangay Certificate. Please submit within 7 days.',
    date: '2024-02-16',
    read: false,
  },
  {
    id: 'NOT-005',
    type: 'info',
    title: 'Upcoming: Wheelchair Distribution — March 20',
    message: 'Assistive devices distribution at Brgy. Malinta covered area on March 20, 2024, 9 AM–3 PM.',
    date: '2024-02-20',
    read: true,
  },
  {
    id: 'NOT-006',
    type: 'info',
    title: '3 New Job Matches Found',
    message: 'Based on your profile skills, 3 new PWD-friendly job opportunities match your qualifications.',
    date: '2024-03-01',
    read: false,
  },
]

export const jobs: Job[] = [
  {
    id: 'JOB-001',
    title: 'Data Entry Assistant',
    company: 'Municipality of Los Baños — Records Section',
    location: 'Los Baños, Laguna',
    employmentType: 'Full-time',
    workArrangement: 'On-site',
    category: 'Administrative',
    salary: '₱13,000 – ₱15,000',
    description: 'Assists the Municipal Records Section with encoding, organizing, and maintaining digital and physical records for the local government.',
    skills: ['Data Entry', 'Microsoft Office', 'Computer Literacy', 'Attention to Detail'],
    minEducation: 'Vocational',
    suitableDisabilities: [],
    accommodations: ['Wheelchair-accessible workplace'],
    slots: 2,
    postedDate: '2026-06-15',
    deadline: '2026-12-31',
    status: 'Open',
    accessibilityInfo: 'Municipal hall has a wheelchair ramp, elevators, and accessible restrooms. Priority placement for qualified PWD applicants under RA 7277.',
  },
  {
    id: 'JOB-002',
    title: 'IT Support Staff',
    company: 'UPLB Information Technology Center',
    location: 'Brgy. Batong Malake',
    employmentType: 'Full-time',
    workArrangement: 'On-site',
    category: 'Technology',
    salary: '₱18,000 – ₱22,000',
    description: 'Provides technical support for computers, networks, and office software across the university campus. Troubleshoots hardware and software issues and assists staff with computer applications.',
    skills: ['Computer Literacy', 'HTML', 'CSS', 'Network Troubleshooting', 'Microsoft Office'],
    minEducation: 'College Graduate',
    suitableDisabilities: [],
    accommodations: ['Wheelchair-accessible workplace'],
    slots: 1,
    postedDate: '2026-06-20',
    deadline: '2026-12-31',
    status: 'Open',
    accessibilityInfo: 'Campus is fully PWD-accessible with ramps, elevators, accessible restrooms, and ergonomic workstations.',
  },
  {
    id: 'JOB-003',
    title: 'Remote Content Writer',
    company: 'IRRI Communications Team',
    location: 'Remote / Los Baños, Laguna',
    employmentType: 'Full-time',
    workArrangement: 'Remote',
    category: 'Media & Communications',
    salary: '₱16,000 – ₱19,000',
    description: 'Writes web articles, newsletters, and social media content for the International Rice Research Institute. Collaborates with the team through online tools.',
    skills: ['Writing', 'English Proficiency', 'Communication', 'Research'],
    minEducation: 'College Graduate',
    suitableDisabilities: [],
    accommodations: ['Remote work', 'Screen-reader-compatible tools', 'Flexible hours', 'Assistive technology provided'],
    slots: 3,
    postedDate: '2026-06-25',
    deadline: '2026-11-30',
    status: 'Open',
    accessibilityInfo: 'Fully remote position with flexible hours. Screen reader-compatible software and assistive technology support provided.',
  },
  {
    id: 'JOB-004',
    title: 'Office Administrative Assistant',
    company: 'IRRI Human Resources',
    location: 'Los Baños, Laguna',
    employmentType: 'Full-time',
    workArrangement: 'Hybrid',
    category: 'Administrative',
    salary: '₱15,000 – ₱18,000',
    description: 'Provides administrative support including scheduling, document preparation, records management, and staff coordination for the HR office.',
    skills: ['Administration', 'Microsoft Office', 'Computer Literacy', 'Customer Service'],
    minEducation: 'College Graduate',
    suitableDisabilities: [],
    accommodations: ['Wheelchair-accessible workplace'],
    slots: 1,
    postedDate: '2026-06-10',
    deadline: '2026-10-31',
    status: 'Open',
    accessibilityInfo: 'IRRI campus has full PWD accessibility with designated parking, accessible workstations, and a supportive HR team.',
  },
  {
    id: 'JOB-005',
    title: 'Customer Service Representative',
    company: 'LACTOSOY Corp.',
    location: 'Bay, Laguna',
    employmentType: 'Full-time',
    workArrangement: 'On-site',
    category: 'Customer Service',
    salary: '₱14,000 – ₱16,000',
    description: 'Handles customer inquiries, order processing, and product information through phone, email, and chat. Supports the sales and distribution team.',
    skills: ['Communication', 'Customer Service', 'English Proficiency', 'Computer Literacy'],
    minEducation: 'Vocational',
    suitableDisabilities: [],
    accommodations: ['Wheelchair-accessible workplace', 'Assistive technology provided'],
    slots: 5,
    postedDate: '2026-07-01',
    deadline: '2026-12-31',
    status: 'Open',
    accessibilityInfo: 'Company office has ramp access, adjustable workstations, and dedicated HR support for PWD employees.',
  },
  {
    id: 'JOB-006',
    title: 'Call Center Agent',
    company: 'LactoSoy BPO Services',
    location: 'Bay, Laguna',
    employmentType: 'Full-time',
    workArrangement: 'On-site',
    category: 'Customer Service',
    salary: '₱16,000 – ₱20,000',
    description: 'Answers inbound customer calls, resolves account inquiries, and escalates issues following standard procedures in a call center environment.',
    skills: ['Communication', 'Customer Service', 'English Proficiency', 'Typing'],
    minEducation: 'High School Graduate',
    suitableDisabilities: [],
    accommodations: ['Wheelchair-accessible workplace', 'Assistive technology provided'],
    slots: 10,
    postedDate: '2026-07-05',
    deadline: '2026-12-31',
    status: 'Open',
    accessibilityInfo: 'Facility has accessible restrooms, ergonomic chairs, and adjustable volume headsets. Accommodation requests are reviewed by HR.',
  },
  {
    id: 'JOB-007',
    title: 'Bookkeeping Assistant',
    company: 'Municipal Accounting Office',
    location: 'Los Baños, Laguna',
    employmentType: 'Full-time',
    workArrangement: 'On-site',
    category: 'Accounting & Finance',
    salary: '₱16,000 – ₱19,000',
    description: 'Assists accountants with encoding financial transactions, maintaining ledgers, organizing vouchers, and preparing simple financial reports.',
    skills: ['Accounting', 'Bookkeeping', 'Microsoft Excel', 'Data Entry', 'Attention to Detail'],
    minEducation: 'College Graduate',
    suitableDisabilities: [],
    accommodations: ['Wheelchair-accessible workplace'],
    slots: 1,
    postedDate: '2026-06-28',
    deadline: '2026-11-15',
    status: 'Open',
    accessibilityInfo: 'Municipal hall has a wheelchair ramp and accessible restrooms. Records office is on the ground floor.',
  },
  {
    id: 'JOB-008',
    title: 'Social Media Assistant',
    company: 'PDAO Communications Office',
    location: 'Los Baños, Laguna',
    employmentType: 'Part-time',
    workArrangement: 'Hybrid',
    category: 'Media & Communications',
    salary: '₱8,000 – ₱10,000',
    description: 'Creates and schedules social media posts for the Persons with Disability Affairs Office, takes photos at events, and monitors page engagement.',
    skills: ['Social Media', 'Writing', 'Design', 'Photography'],
    minEducation: 'Vocational',
    suitableDisabilities: [],
    accommodations: ['Flexible hours', 'Remote work', 'Screen-reader-compatible tools'],
    slots: 2,
    postedDate: '2026-07-08',
    deadline: '2026-12-31',
    status: 'Open',
    accessibilityInfo: 'Office work can be done remotely. Flexible schedule and screen reader-compatible tools available.',
  },
  {
    id: 'JOB-009',
    title: 'Grounds and Garden Assistant',
    company: 'Los Baños Parks and Grounds Office',
    location: 'Brgy. Batong Malake',
    employmentType: 'Full-time',
    workArrangement: 'On-site',
    category: 'Agriculture & Grounds',
    salary: '₱12,000 – ₱14,000',
    description: 'Plants, waters, and maintains the flower beds, trees, and lawns of municipal parks. Prepares soil, trims plants, and keeps the grounds clean and safe for the public.',
    skills: ['Horticulture', 'Plant Care', 'Manual Labor'],
    minEducation: 'High School Level',
    suitableDisabilities: [],
    accommodations: ['Flexible hours', 'Written instructions'],
    slots: 3,
    postedDate: '2026-07-12',
    deadline: '2026-12-31',
    status: 'Open',
    accessibilityInfo: 'Tasks can be paced and assigned by ability. Supervisors give written, step-by-step instructions.',
  },
  {
    id: 'JOB-010',
    title: 'Bakeshop Helper',
    company: 'Los Baños Public Market Bakeshop',
    location: 'Brgy. Anos',
    employmentType: 'Part-time',
    workArrangement: 'On-site',
    category: 'Food & Hospitality',
    salary: '₱9,000 – ₱11,000',
    description: 'Helps prepare dough, bakes bread and pastries, packs finished products, and keeps the baking area clean following food-safety rules.',
    skills: ['Baking', 'Food Processing', 'Food Safety'],
    minEducation: 'Elementary',
    suitableDisabilities: [],
    accommodations: ['Flexible hours', 'Written instructions'],
    slots: 2,
    postedDate: '2026-07-15',
    deadline: '2026-12-15',
    status: 'Open',
    accessibilityInfo: 'Short shifts, seated prep stations, and a quiet back-of-house work area are available on request.',
  },
  {
    id: 'JOB-011',
    title: 'Kitchen Staff — Municipal Canteen',
    company: 'Municipal Canteen Services',
    location: 'Los Baños, Laguna',
    employmentType: 'Full-time',
    workArrangement: 'On-site',
    category: 'Food & Hospitality',
    salary: '₱11,000 – ₱13,000',
    description: 'Prepares and cooks meals for the canteen, follows standard recipes and portioning, and observes food handling and sanitation procedures.',
    skills: ['Cooking', 'Food Safety', 'Food Processing'],
    minEducation: 'High School Graduate',
    suitableDisabilities: [],
    accommodations: ['Wheelchair-accessible workplace', 'Flexible hours'],
    slots: 2,
    postedDate: '2026-07-18',
    deadline: '2026-11-30',
    status: 'Open',
    accessibilityInfo: 'Ground-floor kitchen with wide aisles and adjustable-height prep tables.',
  },
  {
    id: 'JOB-012',
    title: 'Carpentry Shop Assistant',
    company: 'Los Baños Community Woodworks',
    location: 'Brgy. Bayog',
    employmentType: 'Contractual',
    workArrangement: 'On-site',
    category: 'Skilled Trades',
    salary: '₱12,000 – ₱15,000',
    description: 'Assists carpenters in measuring, cutting, sanding, and assembling furniture and repair jobs for barangay facilities.',
    skills: ['Carpentry', 'Manual Labor'],
    minEducation: 'High School Level',
    suitableDisabilities: [],
    accommodations: ['Flexible hours', 'Written instructions'],
    slots: 2,
    postedDate: '2026-07-20',
    deadline: '2026-12-31',
    status: 'Open',
    accessibilityInfo: 'Task assignments match each worker’s ability; power tools are used only after safety orientation.',
  },
  {
    id: 'JOB-013',
    title: 'Freelance Video Editor',
    company: 'PDAO Communications Office',
    location: 'Remote / Los Baños, Laguna',
    employmentType: 'Freelance',
    workArrangement: 'Remote',
    category: 'Media & Communications',
    salary: '₱500 – ₱1,500 per video',
    description: 'Edits short event and advocacy videos for the PDAO social media pages, adds captions and music, and exports files in the required formats.',
    skills: ['Video Editing', 'Videography', 'Photography'],
    minEducation: 'Senior High School Graduate',
    suitableDisabilities: [],
    accommodations: ['Remote work', 'Flexible hours', 'Written instructions'],
    slots: 2,
    postedDate: '2026-07-22',
    deadline: '2026-12-31',
    status: 'Open',
    accessibilityInfo: 'Fully remote with flexible deadlines; instructions are given in writing.',
  },
  // JOB-014..JOB-113: mapped from the 100-job capstone dataset (dataset/mldataset.xlsx); see
  // scripts/map_mldataset_jobs.py + scripts/import-mldataset-jobs.ts to regenerate.
  ...mldatasetJobs,
]

export const adminUsers: AdminUser[] = [
  {
    id: 'ADM-001',
    name: 'Engr. Mario dela Vega',
    position: 'PDAO Coordinator',
    username: 'pdao.admin',
    password: 'admin123',
    role: 'Administrator',
    status: 'Active',
    lastLogin: '2024-03-01 08:32 AM',
    dateCreated: '2022-01-10',
  },
  {
    id: 'ADM-002',
    name: 'Ma. Carmen Santos',
    position: 'Benefits Officer',
    username: 'pdao.benefits',
    password: 'admin123',
    role: 'Benefits Officer',
    status: 'Active',
    lastLogin: '2024-03-01 09:15 AM',
    dateCreated: '2022-03-15',
  },
  {
    id: 'ADM-003',
    name: 'Ronaldo Agustin',
    position: 'Municipal Social Welfare Officer',
    username: 'pdao.socwel',
    password: 'admin123',
    role: 'Social Worker',
    status: 'Active',
    lastLogin: '2024-02-29 10:45 AM',
    dateCreated: '2022-06-01',
  },
  {
    id: 'ADM-004',
    name: 'Janine Pascual',
    position: 'Records Officer',
    username: 'pdao.records',
    password: 'admin123',
    role: 'Records Officer',
    status: 'Active',
    lastLogin: '2024-02-28 02:20 PM',
    dateCreated: '2023-01-20',
  },
  {
    id: 'ADM-005',
    name: 'Leandro Mendoza',
    position: 'Support Staff',
    username: 'pdao.support',
    password: 'admin123',
    role: 'Social Worker',
    status: 'Inactive',
    lastLogin: '2024-01-15 11:00 AM',
    dateCreated: '2023-06-05',
  },
]

export const feedbackTickets: FeedbackTicket[] = [
  {
    id: 'TKT-LB-2024-001',
    pwdName: 'Maria Santos Reyes',
    isAnonymous: false,
    subject: 'Question about Cash Assistance Requirements',
    category: 'Question',
    message: "Good day. I would like to ask what counts as proof of income for the Monthly Cash Assistance Program. I do not have a regular employer. Thank you.",
    dateSubmitted: '2024-02-12',
    status: 'Resolved',
    assignedStaff: 'Ma. Carmen Santos',
    responses: [
      { author: 'Ma. Carmen Santos', date: '2024-02-13', message: 'Good day! For proof of income you may submit any of: Certificate of No Income from your Barangay, latest ITR, or employer certification. A Barangay Certificate of Indigency is sufficient if you have no regular income.' },
    ],
  },
  {
    id: 'TKT-LB-2024-002',
    pwdName: 'Anonymous',
    isAnonymous: true,
    subject: 'Complaint about long processing time',
    category: 'Complaint',
    message: 'My request has been pending for over a month with no update. I urgently need the assistance.',
    dateSubmitted: '2024-02-20',
    status: 'In Progress',
    assignedStaff: 'Ronaldo Agustin',
    responses: [
      { author: 'Ronaldo Agustin', date: '2024-02-21', message: 'We sincerely apologize for the delay. We are looking into this and will provide an update within 2 business days.' },
      { author: 'Ronaldo Agustin', date: '2024-02-21', message: '[INTERNAL] Investigate which request this refers to. Check records.', isInternal: true },
    ],
  },
  {
    id: 'TKT-LB-2024-003',
    pwdName: 'Juan dela Cruz',
    isAnonymous: false,
    subject: 'Feedback on EqualAccess Portal',
    category: 'Feedback',
    message: "Gusto ko pong purihin ang PDAO team para sa bagong online portal. Mas madali na ang pag-check ng status ng aking request. Maraming salamat!",
    dateSubmitted: '2024-02-25',
    status: 'Closed',
    assignedStaff: 'Janine Pascual',
    responses: [
      { author: 'Janine Pascual', date: '2024-02-26', message: 'Maraming salamat sa inyong feedback, Juan! Patuloy kaming magpapabuti ng aming serbisyo para sa lahat ng PWD sa Los Baños.' },
    ],
  },
]

export const activityLog = [
  { user: 'pdao.admin', action: 'Verified PWD Account', date: '2024-03-01', time: '08:45 AM', activity: 'Verified account for PWD-LB-2024-0042 (Maria Santos Reyes)' },
  { user: 'pdao.benefits', action: 'Approved Request', date: '2024-03-01', time: '09:20 AM', activity: 'Approved REQ-LB-2024-002 — Medical Assistance for Maria Santos Reyes' },
  { user: 'pdao.socwel', action: 'Updated Request Status', date: '2024-02-29', time: '10:50 AM', activity: 'Updated REQ-LB-2024-001 to Under Review' },
  { user: 'pdao.records', action: 'Added New Program', date: '2024-02-28', time: '02:30 PM', activity: 'Created Agri-Entrepreneurship Livelihood Training (BEN-005)' },
  { user: 'pdao.admin', action: 'Reset Password', date: '2024-02-27', time: '11:15 AM', activity: 'Reset password for user pdao.records' },
]
