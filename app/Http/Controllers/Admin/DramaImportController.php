<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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

        // Return streaming response for real-time progress
        return response()->stream(function () use ($request) {
            // Increase execution time for batch imports
            set_time_limit(300); // 5 minutes

            $slugs = $request->input('slugs');
            $total = count($slugs);
            $processed = 0;
            $results = [
                'success' => [],
                'failed' => [],
                'skipped' => [],
            ];

            // Send initial progress
            $this->sendProgress([
                'type' => 'start',
                'total' => $total,
                'message' => "Starting import of {$total} dramas...",
            ]);

            // Check which dramas already exist
            $existingSlugs = Drama::whereIn('slug', $slugs)
                ->pluck('title', 'slug')
                ->toArray();

            $cookie = config('services.dramadunyam.cookie');

            foreach ($slugs as $index => $slug) {
                $processed++;

                try {
                    // Skip if already in database
                    if (isset($existingSlugs[$slug])) {
                        $results['skipped'][] = [
                            'slug' => $slug,
                            'title' => $existingSlugs[$slug],
                            'reason' => 'Already in database',
                        ];

                        $this->sendProgress([
                            'type' => 'progress',
                            'current' => $processed,
                            'total' => $total,
                            'slug' => $slug,
                            'status' => 'skipped',
                            'message' => "Skipped: {$existingSlugs[$slug]} (already in database)",
                        ]);

                        continue;
                    }

                    // Send fetching status
                    $this->sendProgress([
                        'type' => 'progress',
                        'current' => $processed,
                        'total' => $total,
                        'slug' => $slug,
                        'status' => 'fetching',
                        'message' => "Fetching data for {$slug}...",
                    ]);

                    $response = Http::timeout(15)
                        ->withHeaders([
                            'Cookie' => $cookie,
                            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        ])->get($this->getBaseUrl()."/series/{$slug}", [
                            'core' => 1,
                            'lang' => 'en',
                        ]);

                    if ($response->successful()) {
                        $apiData = $response->json();
                        $drama = Drama::createOrUpdateFromApi($apiData);

                        $results['success'][] = [
                            'slug' => $slug,
                            'title' => $drama->title,
                        ];

                        $this->sendProgress([
                            'type' => 'progress',
                            'current' => $processed,
                            'total' => $total,
                            'slug' => $slug,
                            'status' => 'success',
                            'message' => "✓ Imported: {$drama->title}",
                            'title' => $drama->title,
                        ]);
                    } else {
                        $results['failed'][] = [
                            'slug' => $slug,
                            'reason' => 'API request failed',
                        ];

                        $this->sendProgress([
                            'type' => 'progress',
                            'current' => $processed,
                            'total' => $total,
                            'slug' => $slug,
                            'status' => 'failed',
                            'message' => "✗ Failed: {$slug} (API request failed)",
                        ]);
                    }

                    // Small delay to avoid overwhelming the API
                    usleep(200000); // 200ms delay
                } catch (\Exception $e) {
                    $results['failed'][] = [
                        'slug' => $slug,
                        'reason' => $e->getMessage(),
                    ];

                    $this->sendProgress([
                        'type' => 'progress',
                        'current' => $processed,
                        'total' => $total,
                        'slug' => $slug,
                        'status' => 'failed',
                        'message' => "✗ Failed: {$slug} ({$e->getMessage()})",
                    ]);
                }
            }

            // Send final summary
            $message = count($results['success']).' dramas imported successfully';
            if (count($results['skipped']) > 0) {
                $message .= ', '.count($results['skipped']).' skipped';
            }
            if (count($results['failed']) > 0) {
                $message .= ', '.count($results['failed']).' failed';
            }

            $this->sendProgress([
                'type' => 'complete',
                'message' => $message,
                'results' => $results,
            ]);
        }, 200, [
            'Cache-Control' => 'no-cache',
            'Content-Type' => 'text/event-stream',
            'X-Accel-Buffering' => 'no', // Disable nginx buffering
        ]);
    }

    /**
     * Send Server-Sent Events progress update
     */
    private function sendProgress(array $data): void
    {
        echo 'data: '.json_encode($data)."\n\n";
        ob_flush();
        flush();
    }
}
