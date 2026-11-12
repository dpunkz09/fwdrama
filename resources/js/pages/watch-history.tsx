import { Head, Link } from '@inertiajs/react';
import { Clock, Play, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useWatchHistory } from '@/hooks/use-watch-history';
import { cn } from '@/lib/utils';

export default function WatchHistory() {
    const { history, loading, deleteHistory } = useWatchHistory();
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
        });
    };

    const handleDelete = async (e: React.MouseEvent, dramaId: number) => {
        e.preventDefault();
        e.stopPropagation();
        
        setDeletingId(dramaId);
        const success = await deleteHistory(dramaId);
        if (success) {
            toast.success('Removed from watch history');
        } else {
            toast.error('Failed to remove from watch history');
        }
        setDeletingId(null);
    };

    return (
        <>
            <Head title="Watch History" />
            <div className="min-h-screen bg-background">
                <main className="container mx-auto max-w-7xl px-4 py-8">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold">Watch History</h1>
                        <p className="mt-2 text-muted-foreground">
                            Pick up where you left off
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Loading your watch history...
                            </div>
                        </div>
                    ) : history.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center py-12 text-center">
                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                    <Clock className="h-7 w-7 text-muted-foreground" />
                                </div>
                                <h3 className="mb-2 text-lg font-semibold">
                                    No watch history yet
                                </h3>
                                <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                                    Start watching dramas and they'll appear here so you can easily continue where you left off.
                                </p>
                                <Button asChild>
                                    <Link href="/">Browse Dramas</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                            {history.map((item) => {
                                if (!item.drama) return null;

                                return (
                                    <div
                                        key={item.drama.id}
                                        className="group relative"
                                    >
                                        <Link
                                            href={`/drama/${item.drama.slug}/watch/${item.last_episode}`}
                                            className="block"
                                        >
                                            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted">
                                                <img
                                                    src={item.drama.cover}
                                                    alt={item.drama.title}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                                
                                                {/* Gradient Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                
                                                {/* Play Button Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 shadow-lg">
                                                        <Play className="h-6 w-6 fill-current text-primary-foreground" />
                                                    </div>
                                                </div>

                                                {/* Episode Badge */}
                                                <div className="absolute top-2 left-2">
                                                    <Badge className="bg-primary/90 text-xs text-primary-foreground backdrop-blur-sm">
                                                        EP {item.last_episode}
                                                    </Badge>
                                                </div>

                                                {/* Time Badge */}
                                                {item.updated_at && (
                                                    <div className="absolute top-2 right-2">
                                                        <Badge variant="secondary" className="bg-black/60 text-xs text-white backdrop-blur-sm">
                                                            {formatDate(item.updated_at)}
                                                        </Badge>
                                                    </div>
                                                )}

                                                {/* Title at Bottom */}
                                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                                    <h3 className="text-xs font-semibold text-white line-clamp-2">
                                                        {item.drama.title}
                                                    </h3>
                                                </div>
                                            </div>
                                        </Link>

                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => handleDelete(e, item.drama.id)}
                                            disabled={deletingId === item.drama.id}
                                            className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Remove from history"
                                        >
                                            <div className={cn(
                                                "flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors",
                                                deletingId === item.drama.id && "opacity-50 cursor-not-allowed"
                                            )}>
                                                {deletingId === item.drama.id ? (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                ) : (
                                                    <X className="h-4 w-4" />
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
