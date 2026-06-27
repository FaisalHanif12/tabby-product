/**
 * PURE helpers for deriving a member's display initials and avatar color.
 * Colors map to the same design tokens the frontend already uses.
 */

const AVATAR_COLORS = [
  'var(--color-tangerine)',
  'var(--color-avatar-teal)',
  'var(--color-avatar-clay)',
  'var(--color-avatar-gold)',
]

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/** Deterministic color pick based on how many members already exist. */
export function colorForIndex(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}
