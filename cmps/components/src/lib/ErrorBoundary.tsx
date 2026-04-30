import React, { Component, ReactNode } from 'react';
import styled from 'styled-components';

const ErrorBox = styled.div`
  padding: 16px 20px;
  margin: 12px;
  background: #2d0a0a;
  border: 1px solid #7f1d1d;
  border-radius: 6px;
  color: #fca5a5;
  font-family: monospace;
  font-size: 13px;
`;

const Title = styled.div`
  font-weight: bold;
  margin-bottom: 6px;
  color: #f87171;
`;

const Message = styled.pre`
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  opacity: 0.85;
`;

interface Props {
  children: ReactNode;
  /** Optional label shown in the error box, e.g. the route name */
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.label ?? '', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <ErrorBox>
          <Title>Error{this.props.label ? ` in ${this.props.label}` : ''}</Title>
          <Message>{error.message}</Message>
        </ErrorBox>
      );
    }
    return this.props.children;
  }
}
