/**
 * Error Boundary Global pour EcoGest
 * 
 * Capture toutes les erreurs React non gérées et affiche une UI gracieuse
 * Envoie automatiquement les erreurs critiques aux logs
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Logger l'erreur critique
    logger.critical(
      'React Error Boundary: Unhandled component error',
      error,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'Global',
        route: window.location.pathname
      },
      'ui'
    );

    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Fallback personnalisé si fourni
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI par défaut
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <CardTitle className="text-2xl">Une erreur est survenue</CardTitle>
              </div>
              <CardDescription>
                Nous sommes désolés, une erreur inattendue s'est produite. 
                L'équipe technique a été notifiée automatiquement.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Détails de l'erreur (visible uniquement en développement) :
                  </p>
                  <div className="bg-muted p-4 rounded-lg overflow-auto max-h-60">
                    <p className="text-sm font-mono text-destructive mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Que faire ?</strong>
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>Essayez de rafraîchir la page</li>
                  <li>Retournez à la page d'accueil</li>
                  <li>Si le problème persiste, contactez le support technique</li>
                </ul>
              </div>
            </CardContent>

            <CardFooter className="flex gap-3">
              <Button onClick={this.handleReset} variant="default" className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                <Home className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
