import { Menu, Building2, HelpCircle, User } from 'lucide-react';

interface NavbarProps {
  account?: string;
}

export function Navbar({ account = 'ikeGPS > Account Demo' }: NavbarProps) {
  return (
    <header
      className="flex items-center shrink-0 w-full select-none"
      style={{
        background: '#2a2f3c',
        paddingTop: '9px',
        paddingBottom: '10px',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
    >
      {/* ── Left group ── */}
      <div className="flex items-center gap-3 shrink-0">

        {/* Hamburger menu icon */}
        <div className="flex items-center justify-center h-[31px] w-6 shrink-0">
          <Menu size={24} color="white" strokeWidth={1.75} />
        </div>

        {/* IKE Logo: logomark + wordmark side by side */}
        <div className="flex items-center h-[31px] shrink-0" style={{ gap: '4.5px' }}>
          {/* Logo Mark: square 24.26 × 24.26px (viewBox 24.2549 × 24.2549) */}
          <img
            alt="IKE logo mark"
            src="/ike-logomark.svg"
            style={{ width: '24.26px', height: '24.26px', flexShrink: 0, display: 'block' }}
          />
          {/* Word Mark: 38.54 × 18.01px (viewBox 38.5404 × 18.0129), vertically centered */}
          <img
            alt="IKE wordmark"
            src="/ike-wordmark.svg"
            style={{ width: '38.54px', height: '18.01px', flexShrink: 0, display: 'block' }}
          />
        </div>

        {/* "Validation" title */}
        <div className="flex items-center h-[31px] pr-3 shrink-0">
          <span
            className="font-barlow text-white leading-none not-italic"
            style={{ fontWeight: 500, fontSize: '19px', lineHeight: '19px', width: '83px' }}
          >
            Validation
          </span>
        </div>

        {/* Building icon + breadcrumb */}
        <div className="flex items-center gap-[10px] h-[31px] shrink-0">
          <div className="flex items-center h-full pb-[2px]">
            <Building2 size={24} color="white" strokeWidth={1.5} />
          </div>
          <div className="flex items-center h-full pt-1">
            <span
              className="font-barlow-sc text-white not-italic leading-none"
              style={{ fontWeight: 400, fontSize: '15px', lineHeight: '15px', width: '138px' }}
            >
              {account}
            </span>
          </div>
        </div>
      </div>

      {/* ── Spacer ── */}
      <div className="flex-1 min-w-0 h-[31px]" style={{ background: '#2a2f3c' }} />

      {/* ── Right group ── */}
      <div className="flex items-center gap-3 h-[31px] shrink-0">

        {/* Help icon */}
        <div className="flex items-center h-full pb-[2px]">
          <HelpCircle size={24} color="white" strokeWidth={1.5} />
        </div>

        {/* Email */}
        <div className="flex items-center h-full pt-[2px]">
          <span
            className="font-barlow-sc text-white not-italic leading-none"
            style={{ fontWeight: 400, fontSize: '15px', lineHeight: '15px', width: '123px' }}
          >
            liz.etzel@ikegps.com
          </span>
        </div>

        {/* User icon */}
        <div className="flex items-center h-full pb-[2px]">
          <User size={24} color="white" strokeWidth={1.5} />
        </div>
      </div>
    </header>
  );
}
