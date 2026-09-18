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
                <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center dark:bg-gray-950">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        Ups, etwas ist schiefgelaufen.
                    </h1>
                    <p className="max-w-sm text-sm text-gray-500">
                        Die Ansicht konnte nicht geladen werden. Deine Daten sind sicher –
                        lade die Seite einfach neu.
                    </p>
                    <button
                        type="button"
                        onClick={this.handleReload}
                        className="rounded-2xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                    >
                        Seite neu laden
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
