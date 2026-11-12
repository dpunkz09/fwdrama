import { Head, Link } from '@inertiajs/react';
import { ChevronDown, Clapperboard, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Platform {
    id: number;
    name: string;
    logo: string | null;
    drama_count: number;
    yetiskin: boolean;
    on8: boolean;
}

interface PlatformsPageProps {
    platforms: Platform[];
}

type SortKey = 'name' | 'dramas';
type BadgeFilter = 'all' | 'yetiskin' | 'on8';

/** Stable hue (0-359) derived from the platform name, used for the initials fallback. */
function hueFromName(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) % 360;
    }
    return hash;
}

function PlatformLogo({ name, logo }: { name: string; logo: string | null }) {
    const [failed, setFailed] = useState(false);

    if (logo && !failed) {
        return (
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted p-1.5 ring-1 ring-border/50 sm:size-20 sm:p-2">
                <img
                    src={logo}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(true)}
                    className="h-full w-full object-contain transition-transform duration-300 sm:group-hover:scale-110"
                />
            </div>
        );
    }

    const hue = hueFromName(name);

    return (
        <div
            className="flex size-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold ring-1 ring-border/50 sm:size-20 sm:text-2xl"
            style={{
                backgroundColor: `hsl(${hue} 70% 50% / 0.15)`,
                color: `hsl(${hue} 70% 45%)`,
            }}
            aria-hidden="true"
        >
            {name.trim().substring(0, 2).toUpperCase()}
        </div>
    );
}

function PlatformCard({ platform }: { platform: Platform }) {
    return (
        <Link
            href={`/platforms/${encodeURIComponent(platform.name)}`}
            className="group flex h-full flex-col items-center gap-2 rounded-xl border bg-card p-2.5 text-center transition-all duration-200 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] sm:gap-3 sm:rounded-2xl sm:p-5 sm:hover:-translate-y-1"
        >
            <PlatformLogo name={platform.name} logo={platform.logo} />

            <div className="flex w-full min-w-0 flex-1 flex-col items-center">
                {/* Reserve two lines on mobile so counts line up across a row */}
                <div className="flex min-h-9 w-full items-center justify-center sm:min-h-0">
                    <h3
                        className="line-clamp-2 min-w-0 max-w-full text-sm font-semibold leading-tight [overflow-wrap:anywhere] transition-colors group-hover:text-primary sm:line-clamp-1 sm:text-lg"
                        title={platform.name}
                    >
                        {platform.name}
                    </h3>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                    {platform.drama_count}{' '}
                    {platform.drama_count === 1 ? 'drama' : 'dramas'}
                </p>
            </div>

            {(platform.yetiskin || platform.on8) && (
                <div className="flex flex-wrap justify-center gap-1">
                    {platform.yetiskin && (
                        <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600 sm:px-2 sm:text-xs dark:text-red-400">
                            18+
                        </span>
                    )}
                    {platform.on8 && (
                        <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 sm:px-2 sm:text-xs dark:text-blue-400">
                            On8
                        </span>
                    )}
                </div>
            )}
        </Link>
    );
}

export default function PlatformsPage({ platforms }: PlatformsPageProps) {
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortKey>('name');
    const [badge, setBadge] = useState<BadgeFilter>('all');

    const totalDramas = useMemo(
        () => platforms.reduce((sum, p) => sum + p.drama_count, 0),
        [platforms],
    );

    const yetiskinCount = useMemo(
        () => platforms.filter((p) => p.yetiskin).length,
        [platforms],
    );
    const on8Count = useMemo(
        () => platforms.filter((p) => p.on8).length,
        [platforms],
    );

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();

        return platforms
            .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
            .filter((p) => badge === 'all' || p[badge])
            .sort((a, b) =>
                sort === 'dramas'
                    ? b.drama_count - a.drama_count ||
                      a.name.localeCompare(b.name)
                    : a.name.localeCompare(b.name),
            );
    }, [platforms, query, sort, badge]);

    const hasActiveFilters = query.trim() !== '' || badge !== 'all';

    const resetFilters = () => {
        setQuery('');
        setBadge('all');
    };

    const chips: { key: BadgeFilter; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: platforms.length },
        ...(yetiskinCount > 0
            ? [{ key: 'yetiskin' as const, label: '18+', count: yetiskinCount }]
            : []),
        ...(on8Count > 0
            ? [{ key: 'on8' as const, label: 'On8', count: on8Count }]
            : []),
    ];

    const chipClass = (active: boolean) =>
        `inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-9 ${
            active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
        }`;

    return (
        <>
            <Head title="Platforms - Drama World" />

            <div className="flex min-h-screen flex-col bg-background text-foreground">
                <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:py-10">
                    {/* ---------------------------- Header ---------------------------- */}
                    <header className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                                Streaming Platforms
                            </h1>
                            <p className="mt-1.5 text-muted-foreground sm:mt-2">
                                Browse dramas by streaming platform
                            </p>
                        </div>

                        {platforms.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                                <span className="font-semibold text-foreground">
                                    {platforms.length}
                                </span>{' '}
                                {platforms.length === 1
                                    ? 'platform'
                                    : 'platforms'}{' '}
                                ·{' '}
                                <span className="font-semibold text-foreground">
                                    {totalDramas}
                                </span>{' '}
                                {totalDramas === 1 ? 'drama' : 'dramas'}
                            </p>
                        )}
                    </header>

                    {platforms.length === 0 ? (
                        /* ------------------------- Empty state ------------------------- */
                        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
                            <Clapperboard className="size-10 text-muted-foreground/50" />
                            <p className="text-muted-foreground">
                                No platforms available yet.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* ------------------------ Toolbar ------------------------ */}
                            {/* Mobile: search on row 1; chips + sort share row 2. Desktop: one row. */}
                            <div className="mb-4 space-y-2 sm:mb-6">
                                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                                    {/* Search (16px text on mobile prevents iOS focus-zoom) */}
                                    <div className="relative w-full sm:max-w-xs">
                                        <Search
                                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <input
                                            type="search"
                                            value={query}
                                            onChange={(e) =>
                                                setQuery(e.target.value)
                                            }
                                            placeholder="Search platforms…"
                                            aria-label="Search platforms"
                                            enterKeyHint="search"
                                            autoComplete="off"
                                            className="h-10 w-full rounded-lg border bg-card pl-9 pr-9 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
                                        />
                                        {query && (
                                            <button
                                                type="button"
                                                onClick={() => setQuery('')}
                                                aria-label="Clear search"
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex min-w-0 items-center gap-2 sm:flex-1">
                                        {/* Filter chips */}
                                        {chips.length > 1 && (
                                            <div
                                                role="group"
                                                aria-label="Filter platforms"
                                                className="-my-0.5 flex min-w-0 flex-1 gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                            >
                                                {chips.map((chip) => (
                                                    <button
                                                        key={chip.key}
                                                        type="button"
                                                        onClick={() =>
                                                            setBadge(chip.key)
                                                        }
                                                        aria-pressed={
                                                            badge === chip.key
                                                        }
                                                        className={chipClass(
                                                            badge === chip.key,
                                                        )}
                                                    >
                                                        {chip.label}
                                                        <span
                                                            className={`hidden text-xs sm:inline ${
                                                                badge ===
                                                                chip.key
                                                                    ? 'text-primary-foreground/80'
                                                                    : 'text-muted-foreground/70'
                                                            }`}
                                                        >
                                                            {chip.count}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Sort */}
                                        <div className="relative ml-auto shrink-0">
                                            <select
                                                value={sort}
                                                onChange={(e) =>
                                                    setSort(
                                                        e.target
                                                            .value as SortKey,
                                                    )
                                                }
                                                aria-label="Sort platforms"
                                                className="h-10 appearance-none rounded-lg border bg-card pl-3 pr-8 text-base outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 sm:text-sm"
                                            >
                                                <option value="name">A–Z</option>
                                                <option value="dramas">
                                                    Most dramas
                                                </option>
                                            </select>
                                            <ChevronDown
                                                className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {hasActiveFilters && (
                                    <p
                                        className="text-sm text-muted-foreground"
                                        aria-live="polite"
                                    >
                                        Showing {visible.length} of{' '}
                                        {platforms.length} platforms
                                    </p>
                                )}
                            </div>

                            {/* -------------------------- Grid -------------------------- */}
                            {visible.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
                                    <Search className="size-10 text-muted-foreground/50" />
                                    <p className="text-muted-foreground">
                                        No platforms match your search.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="rounded-lg border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary"
                                    >
                                        Clear filters
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 lg:grid-cols-5 xl:grid-cols-6">
                                    {visible.map((platform) => (
                                        <PlatformCard
                                            key={platform.id}
                                            platform={platform}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </main>

                {/* ------------------------------ Footer ------------------------------ */}
                <footer className="border-t">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                            <Clapperboard className="h-4 w-4 text-brand" />
                            Drama World
                        </span>
                        <span>© {new Date().getFullYear()}</span>
                    </div>
                </footer>
            </div>
        </>
    );
}