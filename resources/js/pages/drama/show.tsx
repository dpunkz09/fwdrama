import { Head, Link } from '@inertiajs/react';
import {
    Bookmark,
    Clock,
    Globe,
    Heart,
    Layers,
    Play,
    Share2,
    Tv,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLikedDramas } from '@/hooks/use-liked-dramas';
import { useSavedDramas } from '@/hooks/use-saved-dramas';
import { useWatchHistory } from '@/hooks/use-watch-history';
import { cn } from '@/lib/utils';

interface Drama {
    id: number;
    slug: string;
    title: string;
    cover: string;
    available_episodes?: number;
    total_episodes?: number;
    platform: string;
    tags: string[];
    description?: string;
    source_total?: number;
    genre?: string;
    view_count?: number;
    like_count?: number;
    release_date?: string;
    language?: string;
    is_new?: boolean;
    is_popular?: boolean;
    is_featured?: boolean;
}

interface Props {
    drama: Drama | null;
    error?: string;
    saved_count?: number;
    like_count?: number;
}

export default function DramaShow({ drama, error, saved_count = 0, like_count = 0 }: Props) {
    const { getLastEpisode } = useWatchHistory();
    const { toggleSave, isSaved, loadSaveCount } = useSavedDramas();
    const { toggleLike, isLiked: checkIsLiked, loadLikeCount } = useLikedDramas();
    const [displaySaveCount, setDisplaySaveCount] = useState(saved_count);
    const [displayLikeCount, setDisplayLikeCount] = useState(like_count);

    // Load save count and like count on mount
    useEffect(() => {
        if (drama?.id) {
            // Use server-provided counts initially
            setDisplaySaveCount(saved_count);
            setDisplayLikeCount(like_count);
            
            // Then fetch fresh counts (only once on mount)
            loadSaveCount(drama.id).then(count => {
                if (count !== undefined) {
                    setDisplaySaveCount(count);
                }
            });
            
            loadLikeCount(drama.id).then(count => {
                if (count !== undefined) {
                    setDisplayLikeCount(count);
                }
            });
        }
    }, [drama?.id]); // Remove saved_count and like_count from dependencies

    if (error || !drama) {
        return (
            <>
                <Head title="Drama Not Found" />
                <div className="min-h-screen bg-background">
                    <AppHeader />
                    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
                        <Card className="w-full max-w-md">
                            <CardContent className="flex flex-col items-center p-10 text-center">
                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                    <Tv className="h-7 w-7 text-muted-foreground" />
                                </div>
                                <h2 className="mb-2 text-xl font-semibold">
                                    Unable to Load Drama
                                </h2>
                                <p className="mb-6 text-muted-foreground">
                                    {error ||
                                        "This drama's information is not currently available."}
                                </p>
                                <Link href="/">
                                    <Button>Browse other dramas</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </>
        );
    }

    // Handle local storage covers and external URLs
    const coverUrl =
        drama.cover.startsWith('http') || drama.cover.startsWith('/storage')
            ? drama.cover
            : `/storage/covers/${drama.slug}.webp`; // Use local storage path

    const available = drama.available_episodes ?? drama.total_episodes ?? 0;
    const total = drama.total_episodes ?? 0;
    const hasProgress = total > 0 && available !== total;
    const episodeLabel = hasProgress
        ? `${available} of ${total}`
        : `${total > 0 ? total : available}`;

    // Check if user has watch history for this drama
    const lastWatchedEpisode = getLastEpisode(drama.id);
    const resumeEpisode = lastWatchedEpisode || 1;
    const hasWatchHistory = lastWatchedEpisode !== null;
    
    // Check if drama is saved and liked
    const dramaIsSaved = isSaved(drama.id);
    const dramaIsLiked = checkIsLiked(drama.id);

    return (
        <>
            <Head title={drama.title} />
            <div className="min-h-screen bg-background">
                <AppHeader/>

                <main className="container mx-auto max-w-6xl px-4 py-8 md:py-10">
                    <div className="grid gap-6 md:grid-cols-[220px_1fr] md:gap-8 lg:grid-cols-[280px_1fr] lg:gap-10">
                        {/* Poster */}
                        <div className="mx-auto w-full max-w-[240px] self-start md:sticky md:top-20 md:max-w-none">
                            <div className="overflow-hidden rounded-xl border shadow-lg">
                                <img
                                    src={coverUrl}
                                    alt={drama.title}
                                    className="aspect-[2/3] w-full object-cover"
                                />
                            </div>
                        </div>

                        {/* Everything else, stacked tightly in one column */}
                        <div className="min-w-0 space-y-6">
                            {/* Header */}
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                        <Tv className="mr-1 h-3 w-3" />
                                        {drama.platform}
                                    </Badge>
                                    {drama.language && (
                                        <Badge variant="outline" className="text-xs">
                                            <Globe className="mr-1 h-3 w-3" />
                                            {drama.language.toUpperCase()}
                                        </Badge>
                                    )}
                                </div>

                                <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
                                    {drama.title}
                                </h1>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Layers className="h-4 w-4" />
                                    <span>Episodes</span>
                                    <span className="font-bold text-foreground">
                                        {episodeLabel}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                                <Button asChild>
                                    <Link href={`/drama/${drama.slug}/watch/${resumeEpisode}`}>
                                        <Play className="h-4 w-4" />
                                        {hasWatchHistory 
                                            ? `Resume EP.${resumeEpisode}` 
                                            : 'Watch Now'}
                                    </Link>
                                </Button>

                                {available > 1 && (
                                    <Button asChild variant="secondary">
                                        <Link
                                            href={`/drama/${drama.slug}/watch/${available}`}
                                        >
                                            <Clock className="h-4 w-4" />
                                            Latest Episode
                                        </Link>
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => toggleLike(drama.id)}
                                >
                                    <Heart
                                        className={cn(
                                            'h-4 w-4',
                                            dramaIsLiked && 'fill-current text-red-500',
                                        )}
                                    />
                                    Like
                                    {displayLikeCount > 0 && (
                                        <span className="ml-1 text-xs text-muted-foreground">
                                            {displayLikeCount}
                                        </span>
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={async () => await toggleSave(drama.id)}
                                >
                                    <Bookmark
                                        className={cn(
                                            'h-4 w-4',
                                            dramaIsSaved && 'fill-current text-yellow-600',
                                        )}
                                    />
                                    {dramaIsSaved ? 'Saved' : 'Save'}
                                    {displaySaveCount > 0 && (
                                        <span className="ml-1 text-xs text-muted-foreground">
                                            {displaySaveCount}
                                        </span>
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator
                                                .share({
                                                    title: drama.title,
                                                    url: window.location.href,
                                                })
                                                .catch(() => {});
                                        }
                                    }}
                                >
                                    <Share2 className="h-4 w-4" />
                                    Share
                                </Button>
                            </div>

                            {/* Synopsis */}
                            <section className="space-y-2">
                                <h2 className="text-lg font-semibold">Synopsis</h2>
                                {drama.description ? (
                                    <p className="leading-relaxed text-muted-foreground">
                                        {drama.description}
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No description available yet.
                                    </p>
                                )}
                            </section>

                            {/* Tags */}
                            {drama.tags && drama.tags.length > 0 && (
                                <section className="space-y-2">
                                    <h2 className="text-lg font-semibold">Tags</h2>
                                    <div className="flex flex-wrap gap-2">
                                        {drama.tags.map((tag, index) => (
                                            <Badge
                                                key={`${tag}-${index}`}
                                                variant="outline"
                                                className="px-3 py-1 text-sm"
                                            >
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Details */}
                            <Card>
                                <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
                                    <div className="space-y-1">
                                        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                                            <Tv className="h-3.5 w-3.5" />
                                            Platform
                                        </p>
                                        <p className="text-sm font-semibold">
                                            {drama.platform}
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                                            <Layers className="h-3.5 w-3.5" />
                                            Episodes
                                        </p>
                                        <p className="text-sm font-semibold">
                                            {episodeLabel}
                                        </p>
                                    </div>

                                    {drama.language && (
                                        <div className="space-y-1">
                                            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                                                <Globe className="h-3.5 w-3.5" />
                                                Language
                                            </p>
                                            <p className="text-sm font-semibold">
                                                {drama.language.toUpperCase()}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}