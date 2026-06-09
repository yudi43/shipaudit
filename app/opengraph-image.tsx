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
          padding: '60px',
        }}
      >
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div
            style={{
              background: '#4f46e5',
              borderRadius: '8px',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            ⚡
          </div>
          <div style={{ color: '#ffffff', fontSize: '32px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
            Ship<span style={{ color: '#818cf8' }}>Audit</span>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            color: '#ffffff',
            fontSize: '56px',
            fontWeight: 'bold',
            textAlign: 'center',
            lineHeight: 1.1,
            letterSpacing: '-1px',
            marginBottom: '24px',
            maxWidth: '900px',
          }}
        >
          Paste any URL.
          <br />
          <span style={{ color: '#818cf8' }}>AI-powered audit.</span>
        </div>

        {/* Subtext */}
        <div style={{ color: '#64748b', fontSize: '24px', textAlign: 'center', marginBottom: '48px' }}>
          Real-world mobile conditions · Framework-specific fixes · Under 90s
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {['⚡ Under 90s', '✓ Real-world mobile', '⚙ Framework-aware fixes'].map((stat) => (
            <div
              key={stat}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 20px',
                color: '#94a3b8',
                fontSize: '16px',
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
