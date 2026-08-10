import { useState } from 'react'
import { Database, Download, RotateCcw, Server, ShieldCheck, Trash2 } from 'lucide-react'
import { Card, Button, Alert, Modal } from '../../components/ui'
import { useStore } from '../../store'
import { useAdminSession } from '../../context'

export default function AdminSettings() {
  const session = useAdminSession()
  const store = useStore()
  const [confirmReset, setConfirmReset] = useState(false)
  const [exported, setExported] = useState(false)

  const systemStats = [
    { label: 'Registered PWD Accounts', value: store.pwdUsers.length },
    { label: 'Benefit Programs', value: store.benefits.length },
    { label: 'Assistance Requests', value: store.assistanceRequests.length },
    { label: 'Feedback Tickets', value: store.feedbackTickets.length },
    { label: 'Admin Users', value: store.adminUsers.length },
    { label: 'Job Applications', value: store.jobApplications.length },
  ]

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      pwdUsers: store.pwdUsers,
      benefits: store.benefits,
      assistanceRequests: store.assistanceRequests,
      notifications: store.notifications,
      jobs: store.jobs,
      adminUsers: store.adminUsers.map((u) => ({ ...u, password: '••••••••' })),
      feedbackTickets: store.feedbackTickets,
      activityLog: store.activityLog,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `equalaccess-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 3000)
  }

  const role = session?.type === 'admin' ? session.role : 'Administrator'

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">System configuration and data management</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Server size={18} className="text-slate-700" />
          <h3 className="font-semibold text-gray-900">System Information</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-500">Platform</span><span className="font-medium">EqualAccess Portal v1.0</span></div>
          <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-500">Data Storage</span><span className="font-medium">Local browser storage (demo)</span></div>
          <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-500">Your Role</span><span className="font-medium">{role}</span></div>
          <div className="flex justify-between py-2"><span className="text-gray-500">Accessibility</span><span className="font-medium flex items-center gap-1"><ShieldCheck size={14} className="text-teal-600" />WCAG 2.1 AA</span></div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database size={18} className="text-blue-700" />
          <h3 className="font-semibold text-gray-900">Data Summary</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {systemStats.map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {exported && <Alert type="success" title="Backup Exported" message="System data has been exported as a JSON backup file." />}

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Download size={18} className="text-teal-600" />
          <h3 className="font-semibold text-gray-900">Backup & Restore</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">Export all system data as a JSON file for record keeping or migration.</p>
        <Button icon={<Download size={15} />} onClick={handleExport}>Export All Data</Button>
      </Card>

      <Card className="p-6 border-red-100">
        <div className="flex items-center gap-3 mb-2">
          <Trash2 size={18} className="text-red-600" />
          <h3 className="font-semibold text-gray-900">Danger Zone</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Reset all data back to the original demo dataset. All registered users, requests, feedback, and changes will be lost.
        </p>
        <Button variant="danger" icon={<RotateCcw size={15} />} onClick={() => setConfirmReset(true)}>Reset Demo Data</Button>
      </Card>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset Demo Data?" size="sm">
        <p className="text-sm text-gray-600 mb-5">
          This will permanently delete all changes and restore the original demo dataset. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" fullWidth onClick={() => { store.resetData(); setConfirmReset(false) }}>
            Yes, Reset Data
          </Button>
          <Button variant="outline" fullWidth onClick={() => setConfirmReset(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  )
}
