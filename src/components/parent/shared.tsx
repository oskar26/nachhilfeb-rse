import type { LucideIcon } from 'lucide-react';
import { Megaphone, MessageSquare, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ActivityKind } from './types';

/** Anton-Kapitelzeile mit gelbem Wipe-Line (Kardinalregel aus DESIGN.md). */
export function SectionTitle({
    children,
    className,
    action
}: {
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className={cn('flex items-end justify-between gap-4', className)}>
            <div>
                <h2 className="font-display uppercase leading-none tracking-tight text-xl text-gray-950 dark:text-gray-50">
                    {children}
                </h2>
                <div className="h-1 w-10 rounded-full bg-primary mt-2" aria-hidden />
            </div>
            {action}
        </div>
    );
}

/** Einheitlicher Empty-State mit nächstem Schritt. */
export function EmptyState({
    icon: Icon,
    title,
    hint,
    action,
    className
}: {
    icon: LucideIcon;
    title: string;
    hint?: string;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn(
            'rounded-3xl border border-dashed border-gray-200 bg-white/60 px-6 py-12 text-center dark:border-gray-800 dark:bg-gray-900/40',
            className
        )}>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <Icon size={22} aria-hidden />
            </div>
            <p className="font-bold text-gray-900 dark:text-gray-100">{title}</p>
            {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{hint}</p>}
            {action && <div className="mt-5 flex justify-center">{action}</div>}
        </div>
    );
}

/** KPI-Kachel für den Steckbrief (Zahlen in tabellarischen Mono-Ziffern). */
export function KpiTile({
    icon: Icon,
    label,
    value,
    onClick
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    onClick?: () => void;
}) {
    const body = (
        <>
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                <Icon size={13} aria-hidden />
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <div className="mt-1 font-mono tabular-nums text-2xl font-bold leading-none text-gray-950 dark:text-gray-50">
                {value}
            </div>
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="press rounded-2xl border border-gray-100 bg-white p-3 text-left dark:border-gray-800 dark:bg-gray-900"
            >
                {body}
            </button>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-3 text-left dark:border-gray-800 dark:bg-gray-900">
            {body}
        </div>
    );
}

export const ACTIVITY_META: Record<ActivityKind, { icon: LucideIcon; className: string; label: string }> = {
    ad: {
        icon: Megaphone,
        className: 'bg-primary/20 text-yellow-700 dark:bg-primary/10 dark:text-yellow-300',
        label: 'Anzeige'
    },
    request: {
        icon: MessageSquare,
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
        label: 'Anfrage'
    },
    review: {
        icon: Star,
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
        label: 'Bewertung'
    }
};

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '–';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '–';
    return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string | null | undefined): string {
    if (!iso) return '–';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '–';
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Kompakte Status-Pille für Anfragen (pending/accepted/rejected/completed). */
export function RequestStatusChip({ status }: { status: string }) {
    const map: Record<string, { label: string; className: string }> = {
        pending: { label: 'Offen', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
        accepted: { label: 'Angenommen', className: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' },
        rejected: { label: 'Abgelehnt', className: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' },
        completed: { label: 'Abgeschlossen', className: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
    };
    const meta = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold', meta.className)}>
            {meta.label}
        </span>
    );
}
