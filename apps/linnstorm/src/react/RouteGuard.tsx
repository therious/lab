import React from 'react';
import { RoleGuard } from '@therious/users';

// ── Error boundary (class component — hooks cannot catch render errors) ───────

interface BoundaryState { error: Error | null }

class ErrorBoundary extends React.Component<React.PropsWithChildren, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) return (
      <div style={{ padding: '2em', color: 'crimson' }}>
        <strong>Something went wrong in this view.</strong>
        <pre style={{ fontSize: '0.85em', marginTop: '0.5em' }}>{error.message}</pre>
        <button onClick={this.reset}>Try again</button>
      </div>
    );
    return this.props.children;
  }
}

// ── RouteGuard: error boundary + optional role protection ────────────────────
// Usage:
//   <Route path="/foo" element={<RouteGuard><Foo /></RouteGuard>} />
//   <Route path="/admin" element={<RouteGuard roles={['admin']}><AdminView /></RouteGuard>} />

interface Props {
  roles?: string[];
  children: React.ReactNode;
}

export const RouteGuard = ({ roles, children }: Props) => (
  <ErrorBoundary>
    {roles ? <RoleGuard roles={roles}>{children}</RoleGuard> : children}
  </ErrorBoundary>
);
