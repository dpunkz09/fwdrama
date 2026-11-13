<?php

namespace App\Http\Controllers;

use App\Models\Drama;
use App\Models\Platform;
use App\Models\SavedDrama;
use App\Models\WatchHistory;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class DramaController extends Controller
{
    private function getBaseUrl(): string
    {
        return config('services.dramadunyam.api_base_url');
    }

    private function getDramaUrl(): string
    {
        return config('services.dramadunyam.url');
    }

    private const DETAIL_CACHE_TTL_MINUTES = 1440; // 24 hours for detail pages

    /**
     * Display a listing of dramas
     */
    public function index(Request $request)
    {
        $tab = $request->input('tab', 'all');
        $perPage = 24;

        // Base query
        $query = Drama::query();

        // Apply tab-specific filters
        switch ($tab) {
            case 'all':
                $query->orderBy('created_at', 'desc');
                break;

            case 'new':
                $query->where('is_new', true)
                    ->orderBy('created_at', 'desc');
                break;

            case 'most-viewed':
                $query->orderBy('view_count', 'desc');
                break;

            default:
                $query->orderBy('created_at', 'desc');
        }

        // Additional filters (search, platform, etc.)
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($platform = $request->input('platform')) {
            $query->where('platform', $platform);
        }

        if ($genre = $request->input('genre')) {
            $query->whereJsonContains('tags', $genre);
        }

        if ($language = $request->input('language')) {
            $query->where('language', $language);
        }

        // For 'new' and 'most-viewed' tabs, limit to 24 items without pagination
        // For 'all' tab, use pagination
        if (in_array($tab, ['new', 'most-viewed'])) {
            $dramas = $query->limit(24)->get();
            // Create a fake paginator for consistent response structure
            $dramas = new LengthAwarePaginator(
                $dramas,
                $dramas->count(),
                24,
                1,
                ['path' => $request->url(), 'query' => $request->query()]
            );
        } else {
            // Paginate normally for 'all' tab
            $dramas = $query->paginate($perPage)->withQueryString();
        }

        // Normalize tags to ensure they're strings
        $dramas->getCollection()->transform(function ($drama) {
            if ($drama->tags && is_array($drama->tags)) {
                $drama->tags = collect($drama->tags)->map(function ($tag) {
                    if (is_array($tag) && isset($tag['name'])) {
                        return $tag['name'];
                    }
                    if (is_object($tag) && isset($tag->name)) {
                        return $tag->name;
                    }

                    return is_string($tag) ? $tag : null;
                })->filter()->values()->toArray();
            } else {
                $drama->tags = [];
            }

            return $drama;
        });

        // Get filter options
        $platforms = Drama::distinct('platform')
            ->whereNotNull('platform')
            ->where('platform', '!=', '')
            ->pluck('platform')
            ->filter()
            ->sort()
            ->values();

        // Extract unique tags from all dramas to use as genre filters
        $allTags = Drama::whereNotNull('tags')
            ->get()
            ->pluck('tags')
            ->flatten()
            ->unique()
            ->filter(function ($tag) {
                return is_string($tag) && strlen($tag) > 0 && strlen($tag) < 50;
            })
            ->sort()
            ->values();

        $languages = Drama::distinct('language')
            ->whereNotNull('language')
            ->where('language', '!=', '')
            ->pluck('language')
            ->filter()
            ->sort()
            ->values();

        // Get counts for tabs (limit new and most_viewed to 24)
        $newCount = Drama::where('is_new', true)->count();
        $mostViewedCount = Drama::count();

        $counts = [
            'all' => Drama::count(),
            'new' => min($newCount, 24),
            'most_viewed' => min($mostViewedCount, 24),
        ];

        // Get continue watching for authenticated users
        $continueWatching = [];
        if ($request->user()) {
            $continueWatching = WatchHistory::with('drama')
                ->where('user_id', $request->user()->id)
                ->orderBy('updated_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($item) {
                    return [
                        'drama' => $item->drama,
                        'last_episode' => $item->last_episode,
                    ];
                })
                ->toArray();
        }

        return Inertia::render('home', [
            'dramas' => $dramas,
            'currentTab' => $tab,
            'counts' => $counts,
            'continueWatching' => $continueWatching,
            'filters' => [
                'search' => $request->input('search'),
                'platform' => $request->input('platform'),
                'genre' => $request->input('genre'),
                'language' => $request->input('language'),
            ],
            'filterOptions' => [
                'platforms' => $platforms,
                'genres' => $allTags,
                'languages' => $languages,
            ],
        ]);
    }

    public function show(string $slug)
    {
        // Get from database
        $drama = Drama::where('slug', $slug)->first();

        // If we have drama data, render it
        if ($drama) {
            // Normalize tags to ensure they're strings
            if ($drama->tags && is_array($drama->tags)) {
                $drama->tags = collect($drama->tags)->map(function ($tag) {
                    if (is_array($tag) && isset($tag['name'])) {
                        return $tag['name'];
                    }
                    if (is_object($tag) && isset($tag->name)) {
                        return $tag->name;
                    }

                    return is_string($tag) ? $tag : null;
                })->filter()->values()->toArray();
            } else {
                $drama->tags = [];
            }

            // Get saved count for this drama (with caching)
            $savedCount = \Cache::remember(
                "drama_saved_count_{$drama->id}",
                now()->addMinutes(5),
                fn () => SavedDrama::where('drama_id', $drama->id)->count()
            );

            return Inertia::render('drama/show', [
                'drama' => $drama,
                'saved_count' => $savedCount,
                'like_count' => $drama->like_count,
            ]);
        }

        // Fallback: show error
        return Inertia::render('drama/show', [
            'drama' => null,
            'error' => 'Drama not found',
            'saved_count' => 0,
            'like_count' => 0,
        ]);
    }

    public function watch(string $slug, int $episode)
    {
        // Get drama from database
        $drama = Drama::where('slug', $slug)->first();

        if (! $drama) {
            \Log::error('Drama not found for watch', ['slug' => $slug]);

            return Inertia::render('drama/watch', [
                'drama' => null,
                'episode' => $episode,
                'streamData' => null,
                'error' => 'Drama not found',
                'saved_count' => 0,
                'like_count' => 0,
            ]);
        }

        \Log::info('Loading watch page', [
            'slug' => $slug,
            'drama_id' => $drama->id,
            'drama_title' => $drama->title,
            'external_id' => $drama->external_id,
            'episode' => $episode,
            'total_episodes' => $drama->total_episodes,
        ]);

        // Validate episode number
        if ($episode < 1 || $episode > $drama->total_episodes) {
            \Log::warning('Invalid episode number', [
                'episode' => $episode,
                'total_episodes' => $drama->total_episodes,
            ]);

            $savedCount = SavedDrama::where('drama_id', $drama->id)->count();

            return Inertia::render('drama/watch', [
                'drama' => $drama,
                'episode' => $episode,
                'streamData' => null,
                'error' => "Invalid episode number. Episode must be between 1 and {$drama->total_episodes}.",
                'saved_count' => $savedCount,
                'like_count' => $drama->like_count,
            ]);
        }

        // Check if external_id exists
        if (empty($drama->external_id)) {
            \Log::error('Missing external_id', [
                'drama_id' => $drama->id,
                'slug' => $slug,
            ]);

            $savedCount = SavedDrama::where('drama_id', $drama->id)->count();

            return Inertia::render('drama/watch', [
                'drama' => $drama->only(['id', 'slug', 'title', 'cover', 'external_id', 'available_episodes', 'total_episodes']),
                'episode' => $episode,
                'streamData' => null,
                'error' => 'This drama does not have streaming information available.',
                'saved_count' => $savedCount,
                'like_count' => $drama->like_count,
            ]);
        }

        // Get saved count for this drama (with caching)
        $savedCount = \Cache::remember(
            "drama_saved_count_{$drama->id}",
            now()->addMinutes(5),
            fn () => SavedDrama::where('drama_id', $drama->id)->count()
        );

        // Render the watch page - let client-side handle stream fetching with retries
        return Inertia::render('drama/watch', [
            'drama' => $drama->only(['id', 'slug', 'title', 'cover', 'external_id', 'available_episodes', 'total_episodes']),
            'episode' => $episode,
            'streamData' => null, // Client will fetch this
            'error' => null,
            'saved_count' => $savedCount,
            'like_count' => $drama->like_count,
        ]);
    }

    public function getStream(string $slug, int $episode)
    {
        // Get drama from database
        $drama = Drama::where('slug', $slug)->first();

        if (! $drama) {
            return response()->json(['error' => 'Drama not found'], 404);
        }

        // Validate episode number
        if ($episode < 1 || $episode > $drama->total_episodes) {
            return response()->json(['error' => 'Invalid episode number'], 400);
        }

        // Check if external_id exists
        if (empty($drama->external_id)) {
            return response()->json(['error' => 'Drama missing streaming information'], 400);
        }

        $cookie = config('services.dramadunyam.cookie');

        if (empty($cookie)) {
            return response()->json(['error' => 'Streaming service not configured'], 500);
        }

        $apiUrl = $this->getDramaUrl()."/play/{$drama->external_id}/{$episode}";

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Cookie' => $cookie,
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer' => 'https://dramadunyam.com/',
                    'Accept' => 'application/json',
                ])
                ->get($apiUrl);

            $streamData = $response->json();

            // If we got a response (even 202, 503, etc.), return the data for client-side retry logic
            if ($response->successful() || $response->status() === 202 || $response->status() === 503) {
                return response()->json([
                    'streamData' => $streamData,
                    'status' => 'success',
                    'apiStatus' => $response->status(),
                ]);
            } else {
                return response()->json([
                    'error' => "API returned status {$response->status()}",
                    'streamData' => $streamData,
                    'status' => 'error',
                ], 200); // Return 200 so client can check streamData
            }
        } catch (\Exception $e) {
            \Log::error('Failed to fetch stream data', [
                'message' => $e->getMessage(),
                'url' => $apiUrl,
            ]);

            return response()->json([
                'error' => 'Failed to connect to streaming server',
                'status' => 'error',
            ], 500);
        }
    }

    /**
     * Display a listing of platforms
     */
    public function platforms()
    {
        $platforms = Platform::orderBy('name')->get();

        // Add drama count to each platform
        $platforms->each(function ($platform) {
            $platform->drama_count = $platform->drama_count;
        });

        return Inertia::render('platforms', [
            'platforms' => $platforms,
        ]);
    }

    /**
     * Display dramas for a specific platform
     */
    public function platformShow(Request $request, string $platformName)
    {
        // Find the platform
        $platform = Platform::where('name', $platformName)->firstOrFail();

        // Add drama count
        $platform->drama_count = $platform->drama_count;

        $perPage = 24;

        // Base query for dramas on this platform
        $query = Drama::where('platform', $platformName)
            ->orderBy('created_at', 'desc');

        // Additional filters (search, genre, language)
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($genre = $request->input('genre')) {
            $query->whereJsonContains('tags', $genre);
        }

        if ($language = $request->input('language')) {
            $query->where('language', $language);
        }

        // Paginate
        $dramas = $query->paginate($perPage)->withQueryString();

        // Normalize tags
        $dramas->getCollection()->transform(function ($drama) {
            if ($drama->tags && is_array($drama->tags)) {
                $drama->tags = collect($drama->tags)->map(function ($tag) {
                    if (is_array($tag) && isset($tag['name'])) {
                        return $tag['name'];
                    }
                    if (is_object($tag) && isset($tag->name)) {
                        return $tag->name;
                    }

                    return is_string($tag) ? $tag : null;
                })->filter()->values()->toArray();
            } else {
                $drama->tags = [];
            }

            return $drama;
        });

        // Get filter options specific to this platform
        $allTags = Drama::where('platform', $platformName)
            ->whereNotNull('tags')
            ->get()
            ->pluck('tags')
            ->flatten()
            ->unique()
            ->filter(function ($tag) {
                return is_string($tag) && strlen($tag) > 0 && strlen($tag) < 50;
            })
            ->sort()
            ->values();

        $languages = Drama::where('platform', $platformName)
            ->distinct('language')
            ->pluck('language')
            ->filter()
            ->sort()
            ->values();

        return Inertia::render('platform-show', [
            'platform' => $platform,
            'dramas' => $dramas,
            'filters' => [
                'search' => $request->input('search'),
                'genre' => $request->input('genre'),
                'language' => $request->input('language'),
            ],
            'filterOptions' => [
                'genres' => $allTags,
                'languages' => $languages,
            ],
        ]);
    }

    /**
     * Get drama by ID (for API requests)
     */
    public function getDramaById($id)
    {
        $drama = Drama::find($id);

        if (! $drama) {
            return response()->json(['error' => 'Drama not found'], 404);
        }

        // Normalize tags
        if ($drama->tags && is_array($drama->tags)) {
            $drama->tags = collect($drama->tags)->map(function ($tag) {
                if (is_array($tag) && isset($tag['name'])) {
                    return $tag['name'];
                }
                if (is_object($tag) && isset($tag->name)) {
                    return $tag->name;
                }

                return is_string($tag) ? $tag : null;
            })->filter()->values()->toArray();
        } else {
            $drama->tags = [];
        }

        return response()->json($drama);
    }

    /**
     * Proxy HLS requests to add cookies and bypass Cloudflare
     */
    public function proxyHls(Request $request)
    {
        $targetUrl = $request->query('url');

        if (empty($targetUrl)) {
            return response('Missing URL parameter', 400);
        }

        $allowedHost = parse_url($this->getDramaUrl(), PHP_URL_HOST);
        if (parse_url($targetUrl, PHP_URL_HOST) !== $allowedHost) {
            return response('Invalid URL', 403);
        }

        $cookie = config('services.dramadunyam.cookie');
        if (empty($cookie)) {
            return response('Service not configured', 500);
        }

        try {
            $response = Http::timeout(30)
                ->retry(2, 1000, throw: false) // don't turn upstream 4xx into exceptions
                ->withHeaders([
                    'Cookie' => $cookie,
                    'User-Agent' => 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
                    'Referer' => 'https://dramadunyam.com/',
                    'Origin' => 'https://dramadunyam.com',
                ])
                ->get($targetUrl);

            $contentType = $response->header('Content-Type');
            $body = $response->body();

            // Detect by path (ignores ?verify=...) or by the playlist header
            $path = strtolower(parse_url($targetUrl, PHP_URL_PATH) ?? '');
            $isPlaylist = str_ends_with($path, '.m3u8')
                || str_starts_with(ltrim(substr($body, 0, 16)), '#EXTM3U');

            if ($isPlaylist) {
                $body = $this->rewritePlaylist($body, $targetUrl);
                $contentType = 'application/vnd.apple.mpegurl';
            }

            return response($body, $response->status())
                ->header('Content-Type', $contentType ?: 'application/octet-stream')
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type');
        } catch (\Exception $e) {
            \Log::error('HLS proxy error', ['url' => $targetUrl, 'error' => $e->getMessage()]);

            return response('Failed to fetch content', 500);
        }
    }

    private function rewritePlaylist(string $playlist, string $playlistUrl): string
    {
        $proxy = fn (string $uri) => '/api/proxy/hls?url='.urlencode($this->resolveUrl($uri, $playlistUrl));

        $lines = preg_split('/\r\n|\n|\r/', $playlist);

        $lines = array_map(function ($line) use ($proxy) {
            $trimmed = trim($line);

            if ($trimmed === '') {
                return $line;
            }

            // Tags: rewrite URI="..." (EXT-X-KEY, EXT-X-MAP, EXT-X-MEDIA, ...)
            if (str_starts_with($trimmed, '#')) {
                return preg_replace_callback(
                    '/URI="([^"]+)"/',
                    fn ($m) => 'URI="'.$proxy($m[1]).'"',
                    $line
                );
            }

            // Plain line = segment or variant playlist
            return $proxy($trimmed);
        }, $lines);

        return implode("\n", $lines);
    }

    private function resolveUrl(string $uri, string $baseUrl): string
    {
        if (preg_match('#^https?://#i', $uri)) {
            return $uri;
        }

        $base = parse_url($baseUrl);
        $origin = $base['scheme'].'://'.$base['host'].(isset($base['port']) ? ':'.$base['port'] : '');

        if (str_starts_with($uri, '//')) {
            return $base['scheme'].':'.$uri;
        }

        if (str_starts_with($uri, '/')) {
            return $origin.$uri;
        }

        $dir = rtrim(dirname($base['path'] ?? '/'), '/');

        return $origin.$dir.'/'.$uri;
    }
}
