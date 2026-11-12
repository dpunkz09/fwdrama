import { Link } from '@inertiajs/react';
import { 
    Activity, 
    Eye, 
    Heart, 
    Users, 
    TrendingUp, 
    Bookmark, 
    UserCheck,
    Shield,
    Clock,
    BarChart3,
    Sparkles
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Drama {
    id: number;
    title: string;
    slug: string;
    cover: string;
    view_count: number;
    like_count: number;
}

interface DashboardProps {
    stats: {
        total_dramas: number;
        new_dramas: number;
        popular_dramas: number;
        featured_dramas: number;
    };
    analytics: {
        total_views: number;
        total_likes: number;
        total_saved: number;
        total_users: number;
        verified_users: number;
        admin_users: number;
    };
    topViewedDramas: Drama[];
    topLikedDramas: Drama[];
    mostSavedDramas: Array<{ drama: Drama; save_count: number }>;
    recentActivity: {
        new_users_today: number;
        new_dramas_today: number;
        views_today: number;
    };
    platformStats: Array<{ platform: string; count: number }>;
    genreStats: Record<string, number>;
}

interface LiveStats {
    total_views: number;
    total_likes: number;
    total_users: number;
    active_now: number;
}

export default function AdminDashboard({ 
    stats, 
    analytics: initialAnalytics,
    topViewedDramas,
    topLikedDramas,
    mostSavedDramas,
    recentActivity,
    platformStats,
    genreStats 
}: DashboardProps) {
    const [liveStats, setLiveStats] = useState<LiveStats>({
        total_views: initialAnalytics.total_views,
        total_likes: initialAnalytics.total_likes,
        total_users: initialAnalytics.total_users,
        active_now: 0,
    });

    // Poll for live stats every 5 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch('/admin/dashboard/live-stats');
                if (response.ok) {
                    const data = await response.json();
                    setLiveStats(data);
                }
            } catch (error) {
                console.error('Failed to fetch live stats:', error);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Format number with comma separator
    const formatNumber = (num: number): string => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    return (
        <div>
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Admin Dashboard
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Real-time analytics and insights
                    </p>
                </div>

                {/* Live Stats - Highlighted */}
                <div className="mb-8 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                        <h2 className="text-lg font-semibold">Live Statistics</h2>
                        <span className="ml-auto text-xs text-muted-foreground">Updates every 5s</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-background/50 backdrop-blur-sm p-4 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                Total Views
                            </div>
                            <div className="text-2xl font-bold text-primary">{formatNumber(liveStats.total_views)}</div>
                        </div>

                        <div className="bg-background/50 backdrop-blur-sm p-4 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                Total Likes
                            </div>
                            <div className="text-2xl font-bold text-red-500">{formatNumber(liveStats.total_likes)}</div>
                        </div>

                        <div className="bg-background/50 backdrop-blur-sm p-4 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Total Users
                            </div>
                            <div className="text-2xl font-bold text-blue-500">{formatNumber(liveStats.total_users)}</div>
                        </div>

                        <div className="bg-background/50 backdrop-blur-sm p-4 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Activity className="h-3 w-3 text-green-500 animate-pulse" />
                                Active Now
                            </div>
                            <div className="text-2xl font-bold text-green-500">{formatNumber(liveStats.active_now)}</div>
                        </div>
                    </div>
                </div>

                {/* Drama Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Dramas"
                        value={stats.total_dramas}
                        icon={<BarChart3 className="h-8 w-8" />}
                        color="text-foreground"
                    />
                    <StatCard
                        title="New Dramas"
                        value={stats.new_dramas}
                        icon={<Sparkles className="h-8 w-8" />}
                        color="text-blue-500"
                    />
                    <StatCard
                        title="Popular"
                        value={stats.popular_dramas}
                        icon={<TrendingUp className="h-8 w-8" />}
                        color="text-green-500"
                    />
                    <StatCard
                        title="Featured"
                        value={stats.featured_dramas}
                        icon={<Heart className="h-8 w-8" />}
                        color="text-purple-500"
                    />
                </div>

                {/* User & Engagement Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                        title="Total Saved"
                        value={initialAnalytics.total_saved}
                        icon={<Bookmark className="h-8 w-8" />}
                        color="text-yellow-500"
                    />
                    <StatCard
                        title="Verified Users"
                        value={initialAnalytics.verified_users}
                        icon={<UserCheck className="h-8 w-8" />}
                        color="text-cyan-500"
                    />
                    <StatCard
                        title="Admin Users"
                        value={initialAnalytics.admin_users}
                        icon={<Shield className="h-8 w-8" />}
                        color="text-orange-500"
                    />
                </div>

                {/* Recent Activity (24h) */}
                <div className="bg-card border rounded-lg p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold">Last 24 Hours</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="p-3 bg-blue-500/10 rounded-full">
                                <Users className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{recentActivity.new_users_today}</div>
                                <div className="text-sm text-muted-foreground">New Users</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="p-3 bg-green-500/10 rounded-full">
                                <BarChart3 className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{recentActivity.new_dramas_today}</div>
                                <div className="text-sm text-muted-foreground">New Dramas</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="p-3 bg-purple-500/10 rounded-full">
                                <Eye className="h-6 w-6 text-purple-500" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{recentActivity.views_today}</div>
                                <div className="text-sm text-muted-foreground">Episodes Watched</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Top Viewed Dramas */}
                    <div className="bg-card border rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Eye className="h-5 w-5 text-primary" />
                            Top Viewed Dramas
                        </h3>
                        <div className="space-y-3">
                            {topViewedDramas.map((drama, index) => (
                                <Link
                                    key={drama.id}
                                    href={`/drama/${drama.slug}`}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                                >
                                    <span className="text-2xl font-bold text-muted-foreground w-8">
                                        #{index + 1}
                                    </span>
                                    <img 
                                        src={drama.cover} 
                                        alt={drama.title}
                                        className="w-12 h-16 object-cover rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate group-hover:text-primary">{drama.title}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {formatNumber(drama.view_count)} views
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Top Liked Dramas */}
                    <div className="bg-card border rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Heart className="h-5 w-5 text-red-500" />
                            Top Liked Dramas
                        </h3>
                        <div className="space-y-3">
                            {topLikedDramas.map((drama, index) => (
                                <Link
                                    key={drama.id}
                                    href={`/drama/${drama.slug}`}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                                >
                                    <span className="text-2xl font-bold text-muted-foreground w-8">
                                        #{index + 1}
                                    </span>
                                    <img 
                                        src={drama.cover} 
                                        alt={drama.title}
                                        className="w-12 h-16 object-cover rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate group-hover:text-primary">{drama.title}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {formatNumber(drama.like_count)} likes
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Most Saved Dramas */}
                <div className="bg-card border rounded-lg p-6 mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Bookmark className="h-5 w-5 text-yellow-500" />
                        Most Saved Dramas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {mostSavedDramas.map((item, index) => (
                            <Link
                                key={item.drama.id}
                                href={`/drama/${item.drama.slug}`}
                                className="group"
                            >
                                <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                                    <img 
                                        src={item.drama.cover} 
                                        alt={item.drama.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold">
                                        #{index + 1}
                                    </div>
                                </div>
                                <div className="font-medium text-sm truncate group-hover:text-primary">{item.drama.title}</div>
                                <div className="text-xs text-muted-foreground">{item.save_count} saves</div>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Platform Distribution */}
                    <div className="bg-card border rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">Platform Distribution</h3>
                        <div className="space-y-3">
                            {platformStats.map((platform) => {
                                const percentage = (platform.count / stats.total_dramas) * 100;
                                return (
                                    <div key={platform.platform}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium">{platform.platform}</span>
                                            <span className="text-muted-foreground">{platform.count} ({percentage.toFixed(1)}%)</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary transition-all" 
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Genre Distribution */}
                    <div className="bg-card border rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">Top Genres</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(genreStats).map(([genre, count]) => (
                                <div 
                                    key={genre}
                                    className="px-3 py-2 bg-muted rounded-full text-sm flex items-center gap-2"
                                >
                                    <span className="font-medium">{genre}</span>
                                    <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div>
                    <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ActionCard
                            href="/admin/dramas"
                            icon="📚"
                            title="Manage Dramas"
                            description="View and manage all dramas"
                        />
                        <ActionCard
                            href="/admin/import"
                            icon="📥"
                            title="Import Dramas"
                            description="Import from API"
                        />
                        <ActionCard
                            href="/admin/platforms"
                            icon="🎬"
                            title="Platforms"
                            description="Manage streaming platforms"
                        />
                        <ActionCard
                            href="/admin/users"
                            icon="👥"
                            title="Manage Users"
                            description="User management & permissions"
                        />
                        <ActionCard
                            href="/"
                            icon="🏠"
                            title="View Website"
                            description="Go to public site"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: { 
    title: string; 
    value: number; 
    icon: React.ReactNode; 
    color: string;
}) {
    return (
        <div className="bg-card p-6 rounded-lg border">
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">{title}</div>
                <div className={cn(color, "opacity-50")}>{icon}</div>
            </div>
            <div className={cn("text-3xl font-bold", color)}>
                {new Intl.NumberFormat('en-US').format(value)}
            </div>
        </div>
    );
}

function ActionCard({ href, icon, title, description }: {
    href: string;
    icon: string;
    title: string;
    description: string;
}) {
    return (
        <Link
            href={href}
            className="bg-card p-8 rounded-lg border hover:border-primary transition-colors group"
        >
            <div className="text-4xl mb-4">{icon}</div>
            <h2 className="text-xl font-bold mb-2 group-hover:text-primary">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
        </Link>
    );
}
