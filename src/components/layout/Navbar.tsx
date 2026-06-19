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

        {/* IKE Logo: logomark + wordmark */}
        <div className="flex items-center h-[31px] justify-center shrink-0">
          <div
            className="relative shrink-0"
            style={{ width: '67.289px', height: '24.255px' }}
          >
            {/* Logo Mark – occupies the left ~36% of container */}
            <img
              alt="IKE logo mark"
              src="/ike-logomark.svg"
              className="absolute block"
              style={{
                top: 0,
                left: 0,
                bottom: 0,
                right: '63.95%',
                width: 'auto',
                height: '100%',
                objectFit: 'contain',
              }}
            />
            {/* Word Mark – occupies right portion, with vertical inset */}
            <img
              alt="IKE wordmark"
              src="/ike-wordmark.svg"
              className="absolute block"
              style={{
                top: '12.87%',
                left: '42.72%',
                bottom: '12.87%',
                right: 0,
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>
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
