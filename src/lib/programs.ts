import { manilaDate } from './catalog'
import type { Benefit } from '../data'

/** Programs PWDs can see at all (drafts and closed programs stay admin-only). */
export const isPublished = (b: Benefit): boolean => b.status === 'Active' || b.status === 'Approved'

/** The application deadline (YYYY-MM-DD) is before today in Asia/Manila. No deadline = never passes. */
export const deadlinePassed = (b: Benefit, today: string = manilaDate()): boolean =>
  Boolean(b.applicationDeadline) && b.applicationDeadline < today

/** Published and still accepting applications. */
export const isOpenForApplication = (b: Benefit, today: string = manilaDate()): boolean =>
  isPublished(b) && !deadlinePassed(b, today)
