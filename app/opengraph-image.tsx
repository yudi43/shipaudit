import { ImageResponse } from 'next/og'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 64,
        background: '#101311',
        color: '#f1f3e9',
        fontFamily: 'sans-serif',
        borderTop: '6px solid #d5f66b',
      }}
    >
      <div style={{ display: 'flex', fontSize: 30 }}>
        Ship<span style={{ color: '#d5f66b' }}>Audit</span>
      </div>
      <div style={{ color: '#a1afa3', fontSize: 18, marginTop: 42 }}>
        WEB PERFORMANCE, DIAGNOSED.
      </div>
      <div
        style={{
          fontSize: 88,
          fontWeight: 700,
          marginTop: 20,
          letterSpacing: -3,
        }}
      >
        Find the drag.
      </div>
      <div
        style={{
          fontSize: 88,
          fontWeight: 700,
          color: '#d5f66b',
          letterSpacing: -3,
        }}
      >
        Ship the fix.
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 'auto',
          fontSize: 24,
          color: '#a1afa3',
        }}
      >
        Mobile stress test · Prioritized fixes · One prompt for your editor
      </div>
    </div>,
    size,
  )
}
