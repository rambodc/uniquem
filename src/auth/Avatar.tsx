/** A person's photo, or their initials on a green tile when they have none. Decorative: the name is always written next to it. */
export default function Avatar({ src, firstName, lastName, size = 40, className = "" }: { src?: string | null; firstName: string; lastName: string; size?: number; className?: string }) {
  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
  return <span className={`ws-avatar ${className}`.trim()} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">
    {src ? <img src={src} alt="" width={size} height={size} /> : initials}
  </span>;
}
