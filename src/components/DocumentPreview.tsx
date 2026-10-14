import { useEffect, useState } from 'react'
import { FileText, ImageOff } from 'lucide-react'
import { documentUrl, isImagePath } from '../lib/files'

/** One stored file: a clickable thumbnail for a photo, a link for a PDF. Opens in a new tab. */
export function DocumentPreview({ path, label }: { path: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setUrl(null)
    setFailed(false)
    documentUrl(path)
      .then((u) => { if (!cancelled) setUrl(u) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [path])

  if (failed) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-500">
        <ImageOff size={16} className="shrink-0 text-gray-400" />
        <span className="min-w-0"><span className="font-medium text-gray-700 break-all">{label}</span> — file could not be loaded</span>
      </div>
    )
  }

  if (!url) {
    return <div className="h-14 rounded-xl border border-gray-200 bg-gray-50 animate-pulse" aria-label={`Loading ${label}`} />
  }

  if (isImagePath(path)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block group" aria-label={`Open ${label}`}>
        <img src={url} alt={label} onError={() => setFailed(true)} className="w-full h-40 object-contain bg-gray-50 rounded-xl border border-gray-200 group-hover:border-blue-300 transition-colors" />
        <p className="text-xs text-gray-600 mt-1 break-all">{label}</p>
      </a>
    )
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-blue-300 transition-colors text-sm">
      <FileText size={18} className="shrink-0 text-blue-600" />
      <span className="min-w-0 flex-1 font-medium text-gray-800 break-all">{label}</span>
      <span className="text-xs font-semibold text-blue-700 shrink-0">Open</span>
    </a>
  )
}

/** A grid of stored files (the supporting documents of a request, the two sides of a PWD ID). */
export function DocumentList({ files }: { files: { name: string; path: string }[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {files.map((f) => <DocumentPreview key={f.path} path={f.path} label={f.name} />)}
    </div>
  )
}
