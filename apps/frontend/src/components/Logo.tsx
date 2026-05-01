import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  showWordmark?: boolean;
};

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg className="h-10 w-10 shrink-0" viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="datareach-primary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <g transform="translate(10, 0)">
          <path
            d="M30,20 H55 C78,20 95,38 95,60 C95,82 78,100 55,100 H30 V20Z"
            fill="url(#datareach-primary-grad)"
          />
          <circle cx="45" cy="60" r="10" fill="#ffffff" />
          <g fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round">
            <path d="M68,45 C72,50 72,70 68,75" opacity="0.6" />
            <path d="M78,35 C85,45 85,75 78,85" opacity="0.9" />
          </g>
          <circle cx="45" cy="60" r="4" fill="#5B21B6" />
        </g>
      </svg>
      {showWordmark ? (
        <div className="leading-none">
          <span className="text-lg font-bold text-[#1F2937]">Data</span>
          <span className="text-lg font-normal text-[#4B5563]">Reach</span>
        </div>
      ) : null}
    </div>
  );
}
