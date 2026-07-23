import { useState } from 'react'
import { Bell, CheckCheck, CheckCircle, Clock, AlertCircle, Info } from 'lucide-react'
import { notifications, type Notification } from '../../data'
import { Button } from '../../components/ui'

const iconMap = {
  success: <CheckCircle size={20} className="text-green-600" />,
  warning: <AlertCircle size={20} className="text-amber-500" />,
  error: <AlertCircle size={20} className="text-red-500" />,
  info: <Info size={20} className="text-blue-600" />,
}

const bgMap = {
  success: 'bg-green-50',
  warning: 'bg-amber-50',
  error: 'bg-red-50',
  info: 'bg-blue-50',
}

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>(notifications)
  const unread = items.filter((n) => !n.read).length

  const markRead = (id: string) => setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })))

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {unread > 0 ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All notifications read'}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" icon={<CheckCheck size={15} />} onClick={markAllRead}>
            Mark All Read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className={`relative flex gap-4 p-4 rounded-xl border transition-all ${n.read ? 'bg-white border-gray-200' : 'border-blue-200 shadow-sm ' + bgMap[n.type]}`}
            >
              {!n.read && (
                <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-600" aria-label="Unread" />
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bgMap[n.type]}`}>
                {iconMap[n.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                  <p className="text-xs text-gray-400 shrink-0">{n.date}</p>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mt-0.5">{n.message}</p>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-xs text-blue-700 hover:text-blue-800 font-medium mt-2"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
