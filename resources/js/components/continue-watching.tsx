import { Link } from '@inertiajs/react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContinueWatchingProps {
    drama: Drama;
    lastEpisode: number;
    className?: string;
}

export function ContinueWatchingCard({ drama, lastEpisode, className }: ContinueWatchingProps) {
    return (
        <Link
            href={`/drama/${drama.slug}/watch/${lastEpisode}`}
            className={cn(
                'group relative block overflow-hidden rounded-xl transition-all hover:scale-[1.02]',
                className
            )}
        >
            {/* Cover Image */}
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted">
                <img
                    src={drama.cover}
                    alt={drama.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                
                {/* Continue Badge */}
                <div className="absolute top-1 right-1 flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-lg">
                    <Play className="h-2 w-2 fill-current" />
                    Continue
                </div>

                {/* Episode Info */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-[10px] font-medium text-white/90 mb-0.5">
                        Episode {lastEpisode}
                    </p>
                    <h3 className="text-xs font-semibold text-white line-clamp-2">
                        {drama.title}
                    </h3>
                </div>
            </div>
        </Link>
    );
}

interface ContinueWatchingSectionProps {
    items: Array<{
        drama: Drama;
        last_episode: number;
    }>;
}

export function ContinueWatchingSection({ items }: ContinueWatchingSectionProps) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Continue Watching</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                {items.map((item) => (
                    <ContinueWatchingCard
                        key={item.drama.id}
                        drama={item.drama}
                        lastEpisode={item.last_episode}
                    />
                ))}
            </div>
        </div>
    );
}
