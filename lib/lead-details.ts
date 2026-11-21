import { z } from 'zod';
import { SupportedCurrencies, type Student } from './types';

const requiredText = z.string().trim().min(1);
export const contactEmail = (value = '') => value.trim().toLowerCase();
export const contactPhone = (value = '') => value.replace(/\D/g, '');

export const leadDetailsSchema = z.object({
  fullName: requiredText,
  email: z.string().trim().pipe(z.email()).transform(contactEmail),
  phone: requiredText.refine((value) => contactPhone(value).length >= 6, 'Enter a valid phone number.'),
  university: requiredText,
  destinationCity: requiredText,
  destinationCountry: requiredText,
  intake: requiredText,
  budget: z.number().finite().nonnegative(),
  moveInDate: requiredText,
  notes: z.string().trim().default(''),
  currency: z.string().trim().transform((value) => value.toUpperCase()).pipe(z.enum(SupportedCurrencies)).default('GBP'),
  whatsApp: z.string().trim().optional(),
  nationality: z.string().trim().optional(),
  currentCountry: z.string().trim().optional(),
  course: z.string().trim().optional(),
  moveOutDate: z.string().trim().optional(),
  preferredRoom: z.string().trim().optional(),
  accommodationPreference: z.string().trim().optional(),
  occupants: z.number().int().positive().optional(),
  passportStatus: z.string().trim().optional(),
  nextFollowUpAt: z.string().trim().optional(),
  leadSource: z.string().trim().optional(),
});

export type LeadDetails = z.input<typeof leadDetailsSchema>;

export function leadContactConflicts(lead: Pick<LeadDetails, 'email' | 'phone'>, others: Iterable<Pick<LeadDetails, 'email' | 'phone'>>) {
  const email = contactEmail(lead.email);
  const phone = contactPhone(lead.phone);
  const conflicts = { email: false, phone: false };
  for (const other of others) {
    if (email && contactEmail(other.email) === email) conflicts.email = true;
    if (phone && contactPhone(other.phone) === phone) conflicts.phone = true;
    if (conflicts.email && conflicts.phone) break;
  }
  return conflicts;
}

export function leadConflictMessage({ email, phone }: ReturnType<typeof leadContactConflicts>) {
  return email && phone ? 'Email and phone each match an active lead.' :
    email ? 'Email matches an active lead.' :
    phone ? 'Phone matches an active lead.' : '';
}

export const intakeKey = (value: string) => value.toLowerCase().trim().replace(/[.,]/g, '').replace(/[_\s/-]+/g, ' ')
  .replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/g, (month) => month.slice(0, 3))
  .replace(/\s+intake$/, '').replace(/^([a-z]{3}) (\d{2})$/, '$1 20$2');

export function getLeadOwner(student: Pick<Student, 'leadOwnerId' | 'leadOwnerName' | 'assignedSalesExecutiveId' | 'assignedSalesExecutiveName'>) {
  return {
    id: student.leadOwnerId ?? student.assignedSalesExecutiveId ?? '',
    name: student.leadOwnerName ?? student.assignedSalesExecutiveName ?? 'Unassigned',
  };
}

export const canAssignSalesOwner = (stage?: Student['pipelineStage']) =>
  stage !== undefined && ['Qualified', 'Option Shared', 'Payment', 'Fulfilment', 'Closed Won'].includes(stage);

export const leadEditSchema = leadDetailsSchema.extend({
  email: z.string().trim(),
  phone: z.string().trim(),
  university: z.string().trim(),
  destinationCity: z.string().trim(),
  destinationCountry: z.string().trim(),
  intake: z.string().trim(),
  moveInDate: z.string().trim(),
  budget: z.number().finite().nonnegative().optional(),
  currency: z.string().trim().default('GBP'),
});

export function parseLeadCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (!field || quoted) {
        quoted = !quoted;
      } else {
        field += character;
      }
    } else if (!quoted && character === ',') {
      row.push(field.trim());
      field = '';
    } else if (!quoted && (character === '\r' || character === '\n')) {
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
      if (character === '\r' && text[index + 1] === '\n') index++;
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error('A quoted field is missing its closing quote.');
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
