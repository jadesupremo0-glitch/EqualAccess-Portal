// Uploaded files: PWD ID photos and the supporting documents of assistance requests.
//
// Online they live in the private `documents` storage bucket, under a folder named after the PWD
// record id (Row Level Security: the owner and active staff only), and are opened through
// short-lived signed URLs. Offline (no `.env`) a file is kept as a data URL in the demo data.

import { supabase } from './supabase'

export const DOCUMENTS_BUCKET = 'documents'
export const MAX_FILE_BYTES = 5 * 1024 * 1024
/** Longest side of a stored photo. Phone photos are far larger than anyone needs to read an ID. */
const MAX_IMAGE_SIDE = 1600
const SIGNED_URL_SECONDS = 60 * 60

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
}

/** "jpg" | "png" | "pdf", or null for a file type that is not accepted. */
export function fileExtension(file: File): string | null {
  return EXTENSION_BY_TYPE[file.type] ?? null
}

/** Why a file cannot be uploaded, or null when it is fine. */
export function fileProblem(file: File): string | null {
  if (!fileExtension(file)) return `"${file.name}" is not a JPG, PNG, or PDF file.`
  // Photos are shrunk before upload, so only a PDF can still be too large here.
  if (file.type === 'application/pdf' && file.size > MAX_FILE_BYTES) return `"${file.name}" is larger than 5 MB.`
  return null
}

/** Shrinks a photo to at most MAX_IMAGE_SIDE (as JPEG). PDFs and unreadable images pass through. */
export async function prepareFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= 1024 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // JPEG has no transparency: a transparent PNG would otherwise turn black.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

function randomSuffix(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join('')
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Could not read "${file.name}".`))
    reader.readAsDataURL(file)
  })
}

/** Validates and shrinks a file for upload. Throws with a message fit to show the user. */
export async function prepareUpload(file: File): Promise<File> {
  const problem = fileProblem(file)
  if (problem) throw new Error(problem)
  const prepared = await prepareFile(file)
  if (prepared.size > MAX_FILE_BYTES) throw new Error(`"${file.name}" is larger than 5 MB.`)
  return prepared
}

/**
 * Stores a file for the signed-in PWD and returns where it is: a path in the `documents` bucket
 * (`<ownerId>/<folder>/<label>-<random>.<ext>`), or a data URL in the offline demo.
 * Throws with a message fit to show the user.
 */
export async function uploadDocument(ownerId: string, folder: string, label: string, file: File): Promise<string> {
  const prepared = await prepareUpload(file)
  if (!supabase) return readAsDataUrl(prepared)
  const path = `${ownerId}/${folder}/${label}-${randomSuffix()}.${fileExtension(prepared)}`
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, prepared, { contentType: prepared.type })
  if (error) throw new Error(`Could not upload "${file.name}": ${error.message}`)
  return path
}

/** What the offline demo keeps for a file (see uploadDocument). */
export async function fileToDataUrl(file: File): Promise<string> {
  return readAsDataUrl(await prepareUpload(file))
}

/**
 * Sends a file to an upload slot handed out by the register-pwd function (a guest has no
 * storage access of their own). Throws with a message fit to show the user.
 */
export async function uploadToSlot(slot: { path: string; token: string }, file: File): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type })
  if (error) throw new Error(error.message)
}

/** True when the stored file is a picture (shown as a thumbnail) rather than a PDF. */
export function isImagePath(path: string): boolean {
  return path.startsWith('data:') ? path.startsWith('data:image/') : /\.(jpe?g|png)$/i.test(path)
}

/** A URL the browser can display or open for a stored file. Throws when it is not available. */
export async function documentUrl(path: string): Promise<string> {
  if (path.startsWith('data:')) {
    // Browsers refuse to open a data: URL in a new tab, so hand out a blob: URL instead.
    const blob = await (await fetch(path)).blob()
    return URL.createObjectURL(blob)
  }
  if (!supabase) throw new Error('File storage is not configured.')
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS)
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'File not found.')
  return data.signedUrl
}
