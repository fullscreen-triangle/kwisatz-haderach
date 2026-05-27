import { Component } from 'react';

export default class DashboardErrorBoundary extends Component {
  state = { error: null, info: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, info) {
    console.error('[DeskDashboard]', error, info);
    this.setState({ info });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ maxWidth: 760, margin: '48px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#f87171', opacity: 0.7 }}>
          dashboard error
        </div>
        <h1 style={{ fontSize: 18, color: '#f87171' }}>
          {this.state.error.name}: {this.state.error.message}
        </h1>
        <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', opacity: 0.75, lineHeight: 1.6, border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, padding: 12, background: 'var(--assistant-color)', overflow: 'auto', maxHeight: 300 }}>
          {this.state.error.stack ?? '(no stack)'}
        </pre>
      </div>
    );
  }
}
