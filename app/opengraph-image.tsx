import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '80px',
        }}
      >
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '48px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: '#1e293b',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="44" height="28" viewBox="0 0 24 16">
              <polyline
                points="0,8 4,8 7,2 10,14 13,0 16,10 18,8 24,8"
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#ffffff' }}>Ship</span>
            <span style={{ color: '#818cf8' }}>Audit</span>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: 64,
              fontWeight: 800,
              textAlign: 'center',
              lineHeight: 1.1,
              letterSpacing: '-2px',
            }}
          >
            Paste any URL.
          </span>
          <span
            style={{
              color: '#818cf8',
              fontSize: 64,
              fontWeight: 800,
              textAlign: 'center',
              lineHeight: 1.1,
              letterSpacing: '-2px',
            }}
          >
            AI-powered audit.
          </span>
        </div>

        {/* Subtext */}
        <div
          style={{
            display: 'flex',
            color: '#475569',
            fontSize: 24,
            textAlign: 'center',
            marginBottom: '48px',
          }}
        >
          Real-world mobile conditions · Framework-specific fixes · Under 90s
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {['Under 90s', 'Google CWV thresholds', 'Framework-aware fixes'].map((stat) => (
            <div
              key={stat}
              style={{
                display: 'flex',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '10px 20px',
                color: '#64748b',
                fontSize: 16,
              }}
            >
              {stat}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
