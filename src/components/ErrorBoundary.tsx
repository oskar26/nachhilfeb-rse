import { Button } from '@/components/ui/button';
import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: unknown) {
        // Kein PII loggen, nur dass ein Render-Fehler auftrat
        console.error('UI-Fehler abgefangen:', error);
    }

    private handleReload = () => {
        this.setState({ hasError: false });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
                    <h1 className="text-xl font-semibold">
                        Die Seite konnte nicht geladen werden.
                    </h1>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        Deine Daten bleiben gespeichert. Bitte lade die Seite neu.
                    </p>
                    <Button type="button" onClick={this.handleReload} className="h-11 rounded-full px-5 font-semibold">
                        Seite neu laden
                    </Button>
                </div>
            );
        }
        return this.props.children;
    }
}
