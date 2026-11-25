import { doc, type Firestore, type Transaction, type WriteBatch } from 'firebase/firestore';
import type { Activity } from './types';

// Only these fixed labels are safe for the management feed. Descriptions, values,
// attachments, financial events, and arbitrary event types stay in the audit log.
export const OPERATIONAL_ACTIVITY_TYPES = [
  'Partner Portfolio Owner Reassigned', 'Partner Onboarded', 'Partner Updated',
  'Lead Owner Changed', 'Sales Owner Changed', 'Lead Submitted', 'Lead Details Updated',
  'Lead Archived', 'Pipeline Stage Change', 'Priority Change', 'Accommodation Status Change',
  'Booking Status Change', 'Move-in Status Change', 'Property Booking Recorded', 'Property Booking Updated',
] as const;
const permittedTypes = new Set<string>(OPERATIONAL_ACTIVITY_TYPES);

export function operationalActivity(activity: Activity) {
  if (!permittedTypes.has(activity.activityType) || !['admin', 'management'].includes(activity.performedBy.role) ||
      !/^(HA-\d{4}-\d{6}|PART-\d{5})$/.test(activity.studentId) ||
      !/^\d{2} [A-Za-z]{3} \d{4}, \d{2}:\d{2}$/.test(activity.timestamp)) return null;
  return {
    id: activity.id,
    studentId: activity.studentId,
    timestamp: activity.timestamp,
    performedBy: { userId: activity.performedBy.userId, name: activity.performedBy.name, role: activity.performedBy.role },
    activityType: activity.activityType,
  };
}

// The audit and sanitized projection share the surrounding transaction or batch.
export function writeActivity(writer: Transaction | WriteBatch, db: Firestore, activity: Activity, leadDocumentId?: string) {
  (writer as WriteBatch).set(doc(db, 'activities', activity.id), leadDocumentId ? { ...activity, leadDocumentId } : activity);
  // Deploy rules before enabling publication in the frontend build.
  const safe = process.env.NEXT_PUBLIC_OPERATIONAL_ACTIVITY_ENABLED === 'true' ? operationalActivity(activity) : null;
  if (safe) (writer as WriteBatch).set(doc(db, 'operationalActivities', activity.id), safe);
}
