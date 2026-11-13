<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\ImportDramaBatch;
use App\Models\Drama;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class DramaImportController extends Controller
{
    private function getBaseUrl(): string
    {
        return config('services.dramadunyam.api_base_url');
    }

    private function getDramaUrl(): string
    {
        return config('services.dramadunyam.url');
    }

    public function index()
    {
        return Inertia::render('admin/drama-import');
    }

    public function fetchList(Request $request)
    {
        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 64);

        $response = Http::get($this->getBaseUrl().'/yeni-eklenenler', [
            'sayfa' => $page,
            'adet' => $perPage,
            'home' => 1,
            'lang' => 'en',
        ]);

        if ($response->successful()) {
            $data = $response->json();

            // Check which dramas are already in database
            if (isset($data['items'])) {
                $slugs = collect($data['items'])->pluck('slug')->toArray();
                $existingDramas = Drama::whereIn('slug', $slugs)
                    ->pluck('slug')
                    ->toArray();

                // Add 'in_database' flag to each item and fix cover URLs
                $data['items'] = array_map(function ($item) use ($existingDramas) {
                    $item['in_database'] = in_array($item['slug'], $existingDramas);

                    // Convert relative cover URLs to absolute
                    if (! empty($item['cover']) && str_starts_with($item['cover'], '/')) {
                        $item['cover'] = $this->getDramaUrl().$item['cover'];
                    }

                    return $item;
                }, $data['items']);
            }

            return response()->json($data);
        }

        return response()->json(['error' => 'Failed to fetch drama list'], 500);
    }

    public function import(Request $request)
    {
        $request->validate([
            'slug' => 'required|string',
        ]);

        $slug = $request->input('slug');

        // Check if drama already exists in database
        $existingDrama = Drama::where('slug', $slug)->first();
        if ($existingDrama) {
            return response()->json([
                'success' => false,
                'message' => "Drama '{$existingDrama->title}' is already in the database",
                'already_exists' => true,
                'drama' => $existingDrama,
            ]);
        }

        // Fetch drama details from API
        $cookie = config('services.dramadunyam.cookie');

        $response = Http::withHeaders([
            'Cookie' => $cookie,
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ])->get($this->getBaseUrl()."/series/{$slug}", [
            'core' => 1,
            'lang' => 'en',
        ]);

        if (! $response->successful()) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch drama details from API',
            ], 500);
        }

        $apiData = $response->json();

        // Create or update drama in database
        try {
            $drama = Drama::createOrUpdateFromApi($apiData);

            return response()->json([
                'success' => true,
                'message' => "Drama '{$drama->title}' imported successfully",
                'drama' => $drama,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to save drama to database: '.$e->getMessage(),
            ], 500);
        }
    }

    public function batchImport(Request $request)
    {
        $request->validate([
            'slugs' => 'required|array',
            'slugs.*' => 'required|string',
        ]);

        $slugs = $request->input('slugs');

        // Generate unique batch ID
        $batchId = 'batch_'.time().'_'.uniqid();

        // Dispatch job to queue
        ImportDramaBatch::dispatch($batchId, $slugs);

        return response()->json([
            'success' => true,
            'batch_id' => $batchId,
            'message' => 'Import job started in background',
            'total' => count($slugs),
        ]);
    }

    /**
     * Get import progress status
     */
    public function importProgress(Request $request, string $batchId)
    {
        $progress = Cache::get("drama_import:{$batchId}");

        if (! $progress) {
            return response()->json([
                'found' => false,
                'message' => 'Import job not found or expired',
            ], 404);
        }

        return response()->json([
            'found' => true,
            'batch_id' => $batchId,
            ...$progress,
        ]);
    }

    /**
     * Get list of recent import jobs
     */
    public function importHistory()
    {
        // Get all import batch keys from cache
        $pattern = 'drama_import:batch_*';

        // For Laravel cache with Redis
        $keys = Cache::getStore()->getRedis()->keys(config('cache.prefix').':'.$pattern);

        $jobs = [];
        foreach ($keys as $key) {
            // Remove the prefix
            $batchId = str_replace(config('cache.prefix').':drama_import:', '', $key);
            $progress = Cache::get("drama_import:{$batchId}");

            if ($progress) {
                $jobs[] = [
                    'batch_id' => $batchId,
                    'status' => $progress['status'] ?? 'unknown',
                    'current' => $progress['current'] ?? 0,
                    'total' => $progress['total'] ?? 0,
                    'message' => $progress['message'] ?? '',
                    'started_at' => $progress['started_at'] ?? null,
                    'completed_at' => $progress['completed_at'] ?? null,
                ];
            }
        }

        // Sort by newest first
        usort($jobs, function ($a, $b) {
            return ($b['started_at'] ?? '') <=> ($a['started_at'] ?? '');
        });

        return response()->json([
            'jobs' => array_slice($jobs, 0, 10), // Return last 10 jobs
        ]);
    }

    /**
     * Send Server-Sent Events progress update (kept for backward compatibility)
     */
    private function sendProgress(array $data): void
    {
        echo 'data: '.json_encode($data)."\n\n";
        ob_flush();
        flush();
    }
}
