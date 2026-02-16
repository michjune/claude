import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  children: React.ReactNode;
}

export function GlassCard({ glow = false, className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md p-5 transition-all duration-300',
        'hover:border-white/[0.1] hover:bg-white/[0.05]',
        glow && 'shadow-[0_0_30px_-8px_rgba(20,184,166,0.12)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
