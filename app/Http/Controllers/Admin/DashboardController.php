<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Drama;
use App\Models\SavedDrama;
use App\Models\User;
use App\Models\WatchHistory;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        // Basic drama stats
        $stats = [
            'total_dramas' => Drama::count(),
            'new_dramas' => Drama::where('is_new', true)->count(),
            'popular_dramas' => Drama::where('is_popular', true)->count(),
            'featured_dramas' => Drama::where('is_featured', true)->count(),
        ];

        // View analytics
        $analytics = [
            'total_views' => Drama::sum('view_count'),
            'total_likes' => Drama::sum('like_count'),
            'total_saved' => SavedDrama::count(),
            'total_users' => User::count(),
            'verified_users' => User::whereNotNull('email_verified_at')->count(),
            'admin_users' => User::where('is_admin', true)->count(),
        ];

        // Top viewed dramas
        $topViewedDramas = Drama::orderBy('view_count', 'desc')
            ->limit(5)
            ->get(['id', 'title', 'slug', 'cover', 'view_count', 'like_count']);

        // Top liked dramas
        $topLikedDramas = Drama::orderBy('like_count', 'desc')
            ->limit(5)
            ->get(['id', 'title', 'slug', 'cover', 'view_count', 'like_count']);

        // Most saved dramas
        $mostSavedDramas = SavedDrama::selectRaw('drama_id, COUNT(*) as save_count')
            ->groupBy('drama_id')
            ->orderByDesc('save_count')
            ->limit(5)
            ->with('drama:id,title,slug,cover')
            ->get()
            ->map(function ($item) {
                return [
                    'drama' => $item->drama,
                    'save_count' => $item->save_count,
                ];
            });

        // Recent activity (last 24 hours)
        $recentActivity = [
            'new_users_today' => User::where('created_at', '>=', now()->subDay())->count(),
            'new_dramas_today' => Drama::where('created_at', '>=', now()->subDay())->count(),
            'views_today' => WatchHistory::where('updated_at', '>=', now()->subDay())->count(),
        ];

        // Platform stats
        $platformStats = Drama::selectRaw('platform, COUNT(*) as count')
            ->whereNotNull('platform')
            ->where('platform', '!=', '')
            ->groupBy('platform')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        // Genre/Tag distribution (top 10)
        $allTags = Drama::whereNotNull('tags')
            ->pluck('tags')
            ->flatten()
            ->filter(function ($tag) {
                return is_string($tag) && strlen($tag) > 0;
            })
            ->countBy()
            ->sortDesc()
            ->take(10);

        return Inertia::render('admin/dashboard', [
            'stats' => $stats,
            'analytics' => $analytics,
            'topViewedDramas' => $topViewedDramas,
            'topLikedDramas' => $topLikedDramas,
            'mostSavedDramas' => $mostSavedDramas,
            'recentActivity' => $recentActivity,
            'platformStats' => $platformStats,
            'genreStats' => $allTags,
        ]);
    }

    /**
     * Get live stats for real-time updates
     */
    public function liveStats()
    {
        return response()->json([
            'total_views' => Drama::sum('view_count'),
            'total_likes' => Drama::sum('like_count'),
            'total_users' => User::count(),
            'active_now' => \Cache::get('active_users_count', 0),
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
