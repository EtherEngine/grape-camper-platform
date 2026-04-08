import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h2 style={{ color: 'var(--color-danger, #ef4444)' }}>
            Etwas ist schiefgelaufen
          </h2>
          <p style={{ color: 'var(--color-text-secondary, #a3a3a3)' }}>
            {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.5rem 1.5rem',
              background: 'var(--color-primary, #6C3461)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md, 8px)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Erneut versuchen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
