import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
} from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import {
    ShieldCheck,
    LayoutDashboard,
    Users,
    FileText,
    AlertTriangle,
    MessageSquare,
    Key,
    BarChart2,
    ClipboardList,
    ChevronRight,
    Megaphone,
    LifeBuoy,
    MoreHorizontal,
} from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Übersicht', value: 'overview', icon: LayoutDashboard },
    { label: 'Codes & Verifikation', value: 'codes', icon: Key },
    { label: 'Support & Feedback', value: 'support', icon: LifeBuoy },
    { label: 'Nutzer', value: 'users', icon: Users },
    { label: 'Anzeigen', value: 'ads', icon: FileText },
    { label: 'News / Infos', value: 'news', icon: Megaphone },
    { label: 'Meldungen', value: 'reports', icon: AlertTriangle },
    { label: 'Chat', value: 'chat', icon: MessageSquare },
    { label: 'Analytics', value: 'analytics', icon: BarChart2 },
    { label: 'Audit & Coaching', value: 'auditlog', icon: ClipboardList },
];

// Overflow priority: the active section always comes first, then the sections
// most SV admins need during a shift. Everything else moves into "Mehr".
const TAB_PRIORITY = [
    'overview',
    'reports',
    'users',
    'support',
    'ads',
    'news',
    'codes',
    'chat',
    'analytics',
    'auditlog',
];

const TAB_LABELS: Record<string, string> = Object.fromEntries(
    NAV_ITEMS.map(item => [item.value, item.label])
);

function tabButtonClass(active: boolean) {
    return cn(
        'h-11 min-h-11 shrink-0 justify-start gap-1.5 rounded-full px-2 text-[13px] sm:gap-2 sm:px-3 sm:text-sm',
        active
            ? 'bg-card text-foreground shadow-soft hover:bg-card'
            : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'
    );
}

function countClass(value: string) {
    return cn(
        'ml-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums',
        value === 'reports'
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted text-foreground'
    );
}

export default function AdminLayout() {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [openReports, setOpenReports] = useState(0);
    const [openTickets, setOpenTickets] = useState(0);
    const [headerHeight, setHeaderHeight] = useState(0);
    const [visibleTabs, setVisibleTabs] = useState<string[]>(() =>
        NAV_ITEMS.map(item => item.value)
    );

    const rootRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLElement>(null);
    const navRef = useRef<HTMLElement>(null);
    const moreMeasureRef = useRef<HTMLSpanElement>(null);
    const tabMeasureRefs = useRef<Record<string, HTMLSpanElement | null>>({});

    const hash = location.hash.replace(/^#\/?/, '');
    const params = new URLSearchParams(location.search);
    const activeTab = params.get('tab') || hash || 'overview';
    const currentLabel = TAB_LABELS[activeTab] || 'Übersicht';

    const getScrollContainer = useCallback(() => {
        return rootRef.current?.closest('[aria-label="Hauptinhalt"]') as HTMLElement | null;
    }, []);

    const scrollAdminToTop = useCallback(() => {
        getScrollContainer()?.scrollTo({ top: 0, behavior: 'auto' });
    }, [getScrollContainer]);

    useEffect(() => {
        if (!isAdmin) {
            navigate('/', { replace: true });
        }
    }, [isAdmin, navigate]);

    useEffect(() => {
        let cancelled = false;
        const fetchCounts = async () => {
            try {
                const { data, error } = await api.admin.overview();
                if (cancelled || error) return;
                const stats = (data as any)?.stats;
                setOpenReports(Number(stats?.open_reports) || 0);
                setOpenTickets(Number(stats?.open_tickets) || 0);
            } catch {
                /* Zähler optional – Badge bleibt bei Fehler auf 0 */
            }
        };
        fetchCounts();
        window.addEventListener('focus', fetchCounts);
        window.addEventListener('admin:counts-refresh', fetchCounts);
        return () => {
            cancelled = true;
            window.removeEventListener('focus', fetchCounts);
            window.removeEventListener('admin:counts-refresh', fetchCounts);
        };
    }, [location.search]);

    // Ein Tab-Wechsel ist ein Query-Wechsel. Die App-Shell setzt den Scroll nur
    // bei Pfadwechseln zurück, deshalb übernimmt der Admin-Bereich das hier.
    useEffect(() => {
        scrollAdminToTop();
    }, [location.search, scrollAdminToTop]);

    // Keep --admin-header-height and the sticky-header scroll offset on the
    // actual scroll container so in-page anchors and future pages can use it.
    useEffect(() => {
        const container = getScrollContainer();
        if (!container) return;

        container.classList.add('bg-background');
        container.style.setProperty('--admin-header-height', `${headerHeight}px`);
        container.style.scrollPaddingTop = 'calc(var(--admin-header-height) + 0.75rem)';

        return () => {
            container.classList.remove('bg-background');
            container.style.removeProperty('--admin-header-height');
            container.style.removeProperty('scroll-padding-top');
        };
    }, [getScrollContainer, headerHeight]);

    useLayoutEffect(() => {
        const header = headerRef.current;
        if (!header) return;

        const update = () => {
            setHeaderHeight(Math.round(header.getBoundingClientRect().height));
        };
        update();

        const observer = new ResizeObserver(update);
        observer.observe(header);
        return () => observer.disconnect();
    }, []);

    const measureTabs = useCallback(() => {
        const nav = navRef.current;
        if (!nav) return;

        const style = getComputedStyle(nav);
        const padding =
            (Number.parseFloat(style.paddingLeft) || 0) +
            (Number.parseFloat(style.paddingRight) || 0);
        const gap = Number.parseFloat(style.columnGap || style.gap) || 0;
        const moreWidth = moreMeasureRef.current?.offsetWidth ?? 84;
        const available = Math.max(0, nav.clientWidth - padding - moreWidth - gap);

        const activeFirst = [activeTab, ...TAB_PRIORITY].filter(
            (value, index, list) => list.indexOf(value) === index
        );

        const picked: string[] = [];
        let used = 0;

        for (const value of activeFirst) {
            if (!NAV_ITEMS.some(item => item.value === value)) continue;
            const width = tabMeasureRefs.current[value]?.offsetWidth ?? 0;
            const next = used + (picked.length > 0 ? gap : 0) + width;
            // Always keep the active tab, even on very narrow screens. The
            // tab strip scrolls only in that extreme case.
            if (next <= available || picked.length === 0) {
                picked.push(value);
                used = next;
            }
        }

        picked.sort(
            (a, b) =>
                NAV_ITEMS.findIndex(item => item.value === a) -
                NAV_ITEMS.findIndex(item => item.value === b)
        );

        setVisibleTabs(previous =>
            previous.length === picked.length &&
            previous.every((value, index) => value === picked[index])
                ? previous
                : picked
        );
    }, [activeTab]);

    useLayoutEffect(() => {
        measureTabs();
    }, [measureTabs, openReports, openTickets]);

    useLayoutEffect(() => {
        const nav = navRef.current;
        if (!nav) return;

        let cancelled = false;
        const observer = new ResizeObserver(() => measureTabs());
        observer.observe(nav);

        // Web fonts can change tab widths after the first layout pass.
        void document.fonts?.ready.then(() => {
            if (!cancelled) measureTabs();
        });

        return () => {
            cancelled = true;
            observer.disconnect();
        };
    }, [measureTabs]);

    // Keep a deep-linked tab visible even if the measured viewport is tight.
    useEffect(() => {
        const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
        active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [activeTab, visibleTabs]);

    if (!isAdmin) return null;

    const handleNavClick = (value: string) => {
        scrollAdminToTop();
        if (value !== activeTab) {
            navigate(`?tab=${value}`);
        }
    };

    const visibleSet = new Set(visibleTabs);
    const visibleItems = NAV_ITEMS.filter(item => visibleSet.has(item.value));
    const hiddenItems = NAV_ITEMS.filter(item => !visibleSet.has(item.value));

    const renderBadge = (value: string) => {
        const count = value === 'reports' ? openReports : value === 'support' ? openTickets : 0;
        if (count <= 0) return null;
        return <span className={countClass(value)}>{count > 9 ? '9+' : count}</span>;
    };

    const renderTabContent = (value: string, label: string, Icon: typeof LayoutDashboard) => (
        <>
            <Icon size={16} aria-hidden />
            <span className="whitespace-nowrap">{label}</span>
            {renderBadge(value)}
        </>
    );

    const rootStyle = {
        '--admin-header-height': `${headerHeight}px`,
    } as CSSProperties;

    return (
        <div
            ref={rootRef}
            style={rootStyle}
            className="flex min-h-full w-full min-w-0 flex-none flex-col bg-background"
        >
            <header
                ref={headerRef}
                className="sticky top-0 z-30 border-b border-border bg-background"
            >
                <div className="flex min-h-14 items-center gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
                    <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
                        <Link
                            to="/sv-panel?tab=overview"
                            onClick={scrollAdminToTop}
                            className="-ml-1 inline-flex min-h-11 shrink items-center rounded-lg px-1 text-muted-foreground transition-colors hover:text-foreground"
                        >
                            Admin Panel
                        </Link>
                        <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                        <span
                            aria-current="page"
                            className="min-w-0 truncate font-semibold text-foreground"
                        >
                            {currentLabel}
                        </span>
                    </nav>

                    <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
                        <ShieldCheck size={16} aria-hidden />
                        SV Einsicht aktiv
                    </span>
                </div>

                <div className="relative">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-y-1 left-0 z-10 w-3 bg-gradient-to-r from-background to-transparent sm:w-4"
                    />
                    <nav
                        ref={navRef}
                        className="no-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto scroll-smooth px-3 pt-1 pb-2 sm:px-5"
                        aria-label="SV-Admin-Navigation"
                    >
                        {visibleItems.map(({ label, value, icon: Icon }) => {
                            const isActive = activeTab === value;
                            return (
                                <Button
                                    key={value}
                                    variant="ghost"
                                    size="sm"
                                    type="button"
                                    onClick={() => handleNavClick(value)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={tabButtonClass(isActive)}
                                >
                                    {renderTabContent(value, label, Icon)}
                                </Button>
                            );
                        })}

                        {hiddenItems.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            type="button"
                                            aria-label={`Weitere Bereiche (${hiddenItems.length})`}
                                            className={cn(tabButtonClass(false), 'ml-auto min-w-11 justify-center px-0 sm:justify-start sm:px-3')}
                                        />
                                    }
                                >
                                    <MoreHorizontal size={16} aria-hidden />
                                    <span className="hidden whitespace-nowrap sm:inline">Mehr</span>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" sideOffset={6} className="w-64">
                                    <DropdownMenuLabel>Weitere Bereiche</DropdownMenuLabel>
                                    <DropdownMenuGroup>
                                        {hiddenItems.map(({ label, value, icon: Icon }) => (
                                            <DropdownMenuItem
                                                key={value}
                                                onClick={() => handleNavClick(value)}
                                                aria-current={activeTab === value ? 'page' : undefined}
                                                className="gap-2"
                                            >
                                                <Icon size={16} aria-hidden />
                                                <span className="min-w-0 flex-1 truncate">{label}</span>
                                                {renderBadge(value)}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </nav>
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-y-1 right-0 z-10 w-3 bg-gradient-to-l from-background to-transparent sm:w-4"
                    />
                </div>

                {/* Off-screen measurement row. It keeps the tab bar responsive
                    without guessing label widths at 390/768/1440. */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none invisible absolute top-0 -left-[9999px] flex w-max"
                >
                    {NAV_ITEMS.map(({ label, value, icon: Icon }) => (
                        <span
                            key={value}
                            className="inline-flex shrink-0"
                            ref={element => {
                                tabMeasureRefs.current[value] = element;
                            }}
                        >
                            <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                tabIndex={-1}
                                className={tabButtonClass(activeTab === value)}
                            >
                                {renderTabContent(value, label, Icon)}
                            </Button>
                        </span>
                    ))}
                    <span
                        className="inline-flex shrink-0"
                        ref={element => {
                            moreMeasureRef.current = element;
                        }}
                    >
                        <Button variant="ghost" size="sm" type="button" tabIndex={-1} className={cn(tabButtonClass(false), 'min-w-11 justify-center px-0 sm:justify-start sm:px-3')}>
                            <MoreHorizontal size={16} aria-hidden />
                            <span className="hidden whitespace-nowrap sm:inline">Mehr</span>
                        </Button>
                    </span>
                </div>
            </header>

            <main className="w-full flex-1 bg-background scroll-mt-[var(--admin-header-height)] px-4 pb-10 sm:px-6 sm:pb-12">
                <div className="mx-auto w-full max-w-7xl py-5 sm:py-6">
                    {!['overview', 'analytics', 'auditlog'].includes(activeTab) && (
                        <h1 className="sr-only">{currentLabel}</h1>
                    )}
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
