import { cn } from '@/lib/utils'
import type { Member } from '@/lib/tabby-data'

export function Avatar({
  member,
  size = 'md',
  className,
  popKey,
}: {
  member: Member
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** when this value changes the avatar re-pops (used for claim feedback) */
  popKey?: string | number
}) {
  const sizes = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm',
  }
  return (
    <span
      key={popKey}
      style={{ backgroundColor: member.color }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-mono font-semibold text-ink ring-2 ring-receipt motion-safe:animate-pop',
        sizes[size],
        className,
      )}
      title={member.name}
      aria-label={member.name}
    >
      {member.initials}
    </span>
  )
}

export function MemberRoster({
  members,
  activeId,
}: {
  members: Member[]
  activeId?: string
}) {
  return (
    <ul className="flex items-center gap-3" aria-label="People on this tab">
      {members.map((m) => (
        <li key={m.id} className="flex flex-col items-center gap-1.5">
          <span
            style={{ backgroundColor: m.color }}
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-full font-mono text-sm font-semibold text-ink ring-2 ring-receipt transition-transform',
              activeId === m.id && 'scale-110 ring-tangerine',
            )}
          >
            {m.initials}
          </span>
          <span className="text-[11px] font-medium text-receipt/80">
            {m.name}
          </span>
        </li>
      ))}
    </ul>
  )
}
