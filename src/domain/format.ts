/** Display formatting for durations, distance and pace. */

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatKm(distanceM: number): string {
  return `${(distanceM / 1000).toFixed(2)} km`;
}

/** Pace as m:ss per km, or an em dash when not yet meaningful. */
export function formatPace(minPerKm: number | null): string {
  if (minPerKm === null || !Number.isFinite(minPerKm)) return '—';
  const totalSeconds = Math.round(minPerKm * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatSessionDate(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${formatClock(ms)}`;
}
