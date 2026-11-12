import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Clapperboard,
    SearchX,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import DramaPosterCard from '@/components/drama-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Platform {
    id: number;
    name: string;
    logo: string | null;
    drama_count: number;
    yetiskin: boolean;
    on8: boolean;
}

interface Filters {
    search?: string;
    genre?: string;
    language?: string;
}

interface FilterOptions {
    genres: string[];
    languages: string[];
}

interface PageLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Props {
    platform: Platform;
    dramas: {
        data: Drama[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: PageLink[];
    };
    filters: Filters;
    filterOptions: FilterOptions;
}

/* -------------------------------------------------------------------------- */
/*  Pagination                                                                */
/* -------------------------------------------------------------------------- */

function Pagination({ links }: { links: PageLink[] }) {
    return (
        <nav
            aria-label="Pagination"
            className="flex items-center justify-center gap-1.5"
        >
            {links.map((link, index) => {
                const isPrev = /previous/i.test(link.label);
                const isNext = /next/i.test(link.label);
                const isArrow = isPrev || isNext;
                const text = link.label.replace(/<[^>]*>/g, '').trim();

                // "..." gaps from Laravel's paginator
                if (!link.url && !isArrow && !link.active) {
                    return (
                        <span
                            key={index}
                            className="hidden px-1 text-muted-foreground sm:inline"
                        >
                            {text}
                        </span>
                    );
                }

                const content = isPrev ? (
                    <ChevronLeft className="h-4 w-4" />
                ) : isNext ? (
                    <ChevronRight className="h-4 w-4" />
                ) : (
                    text
                );

                const classes = cn(
                    'min-w-9',
                    !isArrow && !link.active && 'hidden sm:inline-flex',
                    link.active &&
                        'border-transparent bg-brand text-brand-foreground hover:bg-brand/90 hover:text-brand-foreground',
                );

                const label = isPrev
                    ? 'Previous page'
                    : isNext
                      ? 'Next page'
                      : `Page ${text}`;

                if (!link.url) {
                    return (
                        <Button
                            key={index}
                            variant="outline"
                            size="icon"
                            disabled
                            aria-label={label}
                            className={classes}
                        >
                            {content}
                        </Button>
                    );
                }

                return (
                    <Button
                        key={index}
                        asChild
                        variant="outline"
                        size="icon"
                        className={classes}
                    >
                        <Link
                            href={link.url}
                            preserveState
                            aria-label={label}
                            aria-current={link.active ? 'page' : undefined}
                        >
                            {content}
                        </Link>
                    </Button>
                );
            })}
        </nav>
    );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function PlatformShow({
    platform,
    dramas,
    filters,
    filterOptions,
}: Props) {
    const [loading, setLoading] = useState(false);
    const genreScrollRef = useRef<HTMLDivElement>(null);
    const [showLeftScroll, setShowLeftScroll] = useState(false);
    const [showRightScroll, setShowRightScroll] = useState(false);

    // Check scroll position for genre chips
    const checkScroll = () => {
        if (genreScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = genreScrollRef.current;
            setShowLeftScroll(scrollLeft > 0);
            setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    // Update scroll buttons on mount and when genres change
    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [filterOptions.genres]);

    // Scroll genre chips
    const scrollGenres = (direction: 'left' | 'right') => {
        if (genreScrollRef.current) {
            const scrollAmount = 200;
            genreScrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    // Dim the grid while Inertia is fetching the next result set
    useEffect(() => {
        const offStart = router.on('start', () => setLoading(true));
        const offFinish = router.on('finish', () => setLoading(false));
        return () => {
            offStart();
            offFinish();
        };
    }, []);

    const updateFilters = (next: Partial<Filters>) => {
        const merged: Filters = { ...filters, ...next };
        const params: Record<string, string> = {};
        (Object.entries(merged) as [string, string | undefined][]).forEach(
            ([key, value]) => {
                if (value) params[key] = value;
            },
        );
        router.get(`/platforms/${encodeURIComponent(platform.name)}`, params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        router.get(`/platforms/${encodeURIComponent(platform.name)}`);
    };

    const hasActiveFilters = Boolean(
        filters.search || filters.genre || filters.language,
    );

    const activeChips = (
        [
            ['search', 'Search', filters.search],
            ['genre', 'Genre', filters.genre],
            ['language', 'Language', filters.language],
        ] as [keyof Filters, string, string | undefined][]
    ).filter(([, , value]) => Boolean(value));

    return (
        <>
            <Head title={`${platform.name} Dramas - Drama World`} />

            <div className="min-h-screen bg-background text-foreground">
                

                {/* ------------------------------- Main ------------------------------- */}
                <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
                    {/* Platform Header */}
                    <div className="space-y-4">
                        <Link
                            href="/platforms"
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to Platforms
                        </Link>

                        <div className="flex items-center gap-4">
                            {/* Platform Logo */}
                            {platform.logo ? (
                                <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 p-2">
                                    <img
                                        src={platform.logo}
                                        alt={platform.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                                    <span className="text-2xl font-bold text-primary">
                                        {platform.name.substring(0, 2).toUpperCase()}
                                    </span>
                                </div>
                            )}

                            {/* Platform Info */}
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                    {platform.name}
                                </h1>
                                <p className="text-muted-foreground mt-1">
                                    {platform.drama_count}{' '}
                                    {platform.drama_count === 1 ? 'drama' : 'dramas'}{' '}
                                    available
                                </p>
                            </div>

                            {/* Badges */}
                            {(platform.yetiskin || platform.on8) && (
                                <div className="ml-auto flex gap-2">
                                    {platform.yetiskin && (
                                        <Badge
                                            variant="outline"
                                            className="border-red-500/50 text-red-600 dark:text-red-400"
                                        >
                                            18+
                                        </Badge>
                                    )}
                                    {platform.on8 && (
                                        <Badge
                                            variant="outline"
                                            className="border-blue-500/50 text-blue-600 dark:text-blue-400"
                                        >
                                            On8
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Genre chips */}
                    {filterOptions.genres.length > 0 && (
                        <div className="relative -mx-4 sm:mx-0">
                            {/* Left Scroll Button */}
                            {showLeftScroll && (
                                <button
                                    type="button"
                                    onClick={() => scrollGenres('left')}
                                    className="absolute left-0 top-0 z-10 hidden h-full items-center justify-center bg-gradient-to-r from-background via-background/80 to-transparent px-2 md:flex"
                                    aria-label="Scroll left"
                                >
                                    <div className="rounded-full bg-background/80 p-1 backdrop-blur-sm">
                                        <ChevronLeft className="h-4 w-4" />
                                    </div>
                                </button>
                            )}

                            {/* Genre Chips Container */}
                            <div
                                ref={genreScrollRef}
                                onScroll={checkScroll}
                                className={cn(
                                    'scrollbar-hide flex gap-2 overflow-x-auto pb-1',
                                    showLeftScroll && 'px-4 md:pl-10',
                                    showRightScroll && 'px-4 md:pr-10',
                                    !showLeftScroll && !showRightScroll && 'px-4 sm:px-0',
                                )}
                            >
                                {['', ...filterOptions.genres].map((genre) => {
                                    const active = (filters.genre || '') === genre;
                                    return (
                                        <button
                                            key={genre || 'all'}
                                            type="button"
                                            onClick={() => updateFilters({ genre })}
                                            aria-pressed={active}
                                            className={cn(
                                                'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                                                active
                                                    ? 'border-foreground bg-foreground text-background'
                                                    : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                            )}
                                        >
                                            {genre || 'All'}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Right Scroll Button */}
                            {showRightScroll && (
                                <button
                                    type="button"
                                    onClick={() => scrollGenres('right')}
                                    className="absolute right-0 top-0 z-10 hidden h-full items-center justify-center bg-gradient-to-l from-background via-background/80 to-transparent px-2 md:flex"
                                    aria-label="Scroll right"
                                >
                                    <div className="rounded-full bg-background/80 p-1 backdrop-blur-sm">
                                        <ChevronRight className="h-4 w-4" />
                                    </div>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Results summary + active filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="mr-1 text-sm text-muted-foreground">
                            Showing {dramas.data.length} of {dramas.total} dramas
                        </p>
                        {activeChips.map(([key, label, value]) => (
                            <Badge
                                key={key}
                                variant="secondary"
                                className="gap-1 pr-1.5"
                            >
                                {label}: {value}
                                <button
                                    type="button"
                                    onClick={() => updateFilters({ [key]: '' })}
                                    aria-label={`Remove ${label} filter`}
                                    className="rounded-full p-0.5 hover:bg-foreground/10"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                Clear all
                            </Button>
                        )}
                    </div>

                    {/* Grid / empty state */}
                    {dramas.data.length > 0 ? (
                        <>
                            <div
                                className={cn(
                                    'grid grid-cols-3 gap-x-4 gap-y-6 transition-opacity sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
                                    loading && 'opacity-60',
                                )}
                            >
                                {dramas.data.map((drama) => (
                                    <DramaPosterCard key={drama.id} drama={drama} />
                                ))}
                            </div>

                            {dramas.last_page > 1 && (
                                <div className="pt-4">
                                    <Pagination links={dramas.links} />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center rounded-3xl border border-dashed px-4 py-20 text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                <SearchX className="h-7 w-7 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold">No dramas found</h3>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                {hasActiveFilters
                                    ? 'Try a different search or remove some filters.'
                                    : `No dramas available for ${platform.name} yet.`}
                            </p>
                            {hasActiveFilters && (
                                <Button
                                    variant="outline"
                                    className="mt-5"
                                    onClick={clearFilters}
                                >
                                    Clear filters
                                </Button>
                            )}
                        </div>
                    )}
                </main>

                {/* ------------------------------ Footer ------------------------------ */}
                <footer className="mt-8 border-t">
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
