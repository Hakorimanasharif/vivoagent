export function messagePlainText(text: string): string {
  if (/!\[Image\]\((.*?)\)/.test(text)) return '[Ifoto]';
  if (/\[AUDIO\]\((.*?)\)/.test(text)) return "[Ubutumwa bw'ijwi]";
  return text;
}

export function extractImageUrlFromMessage(text: string): string | null {
  const m = text.match(/!\[Image\]\((https?:\/\/[^\s)]+)\)/i);
  return m?.[1]?.trim() ?? null;
}

export function extractAudioUrlFromMessage(text: string): string | null {
  const m = text.match(/\[AUDIO\]\((https?:\/\/[^\s)]+)\)/i);
  return m?.[1]?.trim() ?? null;
}

export function presenceSubtitle(user: {
  recentlyActive?: boolean;
  lastMessageFromUserAt?: string | null;
  lastLogin?: string | null;
}): { label: string; dotClass: string } {
  if (user.recentlyActive) {
    return { label: 'Ari kuri murandasi', dotClass: 'bg-emerald-500 animate-pulse' };
  }
  if (user.lastMessageFromUserAt) {
    const d = new Date(user.lastMessageFromUserAt);
    return {
      label: `Yohereje ubutumwa: ${d.toLocaleString('rw-RW', { dateStyle: 'short', timeStyle: 'short' })}`,
      dotClass: 'bg-slate-400',
    };
  }
  if (user.lastLogin) {
    const d = new Date(user.lastLogin);
    return {
      label: `Yinjiye: ${d.toLocaleString('rw-RW', { dateStyle: 'short', timeStyle: 'short' })}`,
      dotClass: 'bg-slate-400',
    };
  }
  return { label: 'Umukiliya', dotClass: 'bg-slate-400' };
}
