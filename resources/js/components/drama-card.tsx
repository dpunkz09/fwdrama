import { Link } from '@inertiajs/react';
import { Eye, Flame, Play } from 'lucide-react';
import { type Drama, dramaUrl, formatCount } from '@/lib/drama';
import { cn } from '@/lib/utils';

interface Props {
    drama: Drama;
    className?: string;
}

export default function DramaCard({ drama, className }: Props) {
    const { available_episodes: available, total_episodes: total } = drama;
    const isComplete = total > 0 && available >= total;
    const progress =
        total > 0 ? Math.min(100, Math.round((available / total) * 100)) : 0;

    return (
        <Link
            href={dramaUrl(drama.slug)}
            className={cn('group block rounded-xl outline-none', className)}
        >
            {/* Poster */}
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted ring-1 ring-border transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:ring-brand/60 group-focus-visible:ring-2 group-focus-visible:ring-brand">
                <img
                    src={drama.cover}
                    alt={drama.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
                
                {/* Top-left status badges */}
                <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
                    {drama.is_new && (
                        <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-foreground">
                            New
                        </span>
                    )}
                    {drama.is_popular && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                            <Flame className="h-3 w-3 text-orange-400" />
                            Hot
                        </span>
                    )}
                </div>

                {/* Episode count */}
                <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                    {isComplete ? `${total} EP` : `${available}/${total} EP`}
                </span>

                {/* Play button on hover */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg">
                        <Play className="ml-0.5 h-5 w-5 fill-current" />
                    </span>
                </div>

                {/* Platform + upload progress for ongoing dramas */}
                <div className="absolute inset-x-0 bottom-0 px-2.5 pb-3">
                    <p className="truncate text-[11px] font-medium text-white/85">
                        {drama.platform}
                    </p>
                </div>

                {!isComplete && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                        <div
                            className="h-full bg-brand"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Meta */}
            <div className="mt-2.5 space-y-1 px-0.5">
                <h3 className="line-clamp-1 text-sm font-semibold leading-tight transition-colors group-hover:text-brand">
                    {drama.title}
                </h3>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">
                        {drama.genre} · {drama.language}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatCount(drama.view_count)}
                    </span>
                </div>
            </div>
        </Link>
    );
}
