import { intakeKey } from './lead-details';
import type { Partner, Student } from './types';

export function partnerPerformance(partners: Partner[], leads: Student[], season: string) {
  const byPartner = new Map<string, { total: number; seasonal: number }>();
  for (const lead of leads) {
    if (lead.isTestRecord || lead.archivalStatus === 'Flagged For Archival') continue;
    const counts = byPartner.get(lead.partnerId) || { total: 0, seasonal: 0 };
    counts.total++;
    if (season && lead.intake && intakeKey(lead.intake) === season) counts.seasonal++;
    byPartner.set(lead.partnerId, counts);
  }
  return partners.map(partner => {
    const target = partner.leadTargets?.find(entry => intakeKey(entry.season) === season)?.promised;
    const { total, seasonal } = byPartner.get(partner.partnerId) || { total: 0, seasonal: 0 };
    return { partner, total, seasonal, target, remaining: Math.max(0, (target ?? 0) - seasonal) };
  });
}

export function partnershipSeasons(partners: Partner[]) {
  return Array.from(new Map(partners.flatMap(partner => (partner.leadTargets || []).map(
    ({ season }) => [intakeKey(season), season] as const,
  )))).sort(([left], [right]) => {
    const order = (key: string) => {
      const [month, year] = key.split(' ');
      const monthIndex = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(month);
      return monthIndex < 0 || !/^\d{4}$/.test(year) ? Infinity : Number(year) * 12 + monthIndex;
    };
    const now = new Date();
    const current = now.getFullYear() * 12 + now.getMonth();
    const x = order(left), y = order(right);
    return Number(x < current) - Number(y < current) || (x < current ? y - x : x - y) || left.localeCompare(right);
  });
}
