import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#F8F9FB', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
            padding: '32px 40px', maxWidth: 480, width: '100%', margin: '0 16px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>
            <div style={{fontSize: 32, marginBottom: 12}}>⚠️</div>
            <h2 style={{fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px'}}>Something went wrong</h2>
            <p style={{fontSize: 13, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5}}>
              Open browser DevTools (F12) → Console to see the error details.
            </p>
            <pre style={{
              background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 8,
              padding: '12px 14px', fontSize: 11, color: '#DC2626', overflowX: 'auto',
              margin: '0 0 20px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#001660', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
