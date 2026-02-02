import { Component, ReactNode } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error a servicio externo (Sentry, LogRocket, etc.)
    console.error('Error Boundary caught:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Callback opcional para logging externo
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Si hay fallback custom, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback por defecto
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <Card className="max-w-2xl w-full">
            <CardContent className="py-10">
              <div className="text-center space-y-4">
                <div className="text-6xl">⚠️</div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-600">
                  We're sorry, but an unexpected error occurred. 
                  Please try refreshing the page or go back to the home page.
                </p>

                <div className="flex justify-center gap-3 pt-4">
                  <Button onClick={() => window.location.reload()}>
                    Refresh Page
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => window.location.href = '/dashboard'}
                  >
                    Go to Dashboard
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={this.handleReset}
                  >
                    Try Again
                  </Button>
                </div>

                {/* Error details (collapsible) - Solo en desarrollo */}
                {import.meta.env.DEV && this.state.error && (
                  <details className="mt-6 text-left">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                      Show error details (dev only)
                    </summary>
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-mono text-red-800 mb-2">
                        <strong>Error:</strong> {this.state.error.message}
                      </p>
                      {this.state.error.stack && (
                        <pre className="text-xs text-red-700 overflow-auto max-h-64">
                          {this.state.error.stack}
                        </pre>
                      )}
                      {this.state.errorInfo && (
                        <pre className="text-xs text-red-700 overflow-auto max-h-64 mt-4">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Error Boundary específico para features (más pequeño)
export const FeatureErrorBoundary = ({ 
  children, 
  featureName 
}: { 
  children: ReactNode; 
  featureName: string;
}) => {
  return (
    <ErrorBoundary
      fallback={
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center">
            <p className="text-red-800 font-medium mb-2">
              ⚠️ {featureName} failed to load
            </p>
            <p className="text-sm text-red-600 mb-4">
              An error occurred while loading this section
            </p>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  );
};
