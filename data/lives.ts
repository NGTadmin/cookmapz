import type { DonationTier } from '../types/live';

export const TICKET_TIERS: DonationTier[] = [
  { id: 'watch', label: 'Watch live', amount: 8, perks: 'Join the stream and watch your dish being cooked' },
  { id: 'vip', label: 'VIP seat', amount: 18, perks: 'Live access + ask the chef questions in chat' },
  { id: 'kitchen', label: 'Kitchen pass', amount: 35, perks: 'Front-row live view + recipe notes after the stream' },
];

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}
