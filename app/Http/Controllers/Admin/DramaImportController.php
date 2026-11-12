<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Drama;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class DramaImportController extends Controller
{
    private const BASE_URL = 'https://dramadunyam.com/api';

    public function index()
    {
        return Inertia::render('admin/drama-import');
    }

    public function fetchList(Request $request)
    {
        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 64);

        $response = Http::get(self::BASE_URL.'/yeni-eklenenler', [
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
                        $item['cover'] = 'https://dramadunyam.com'.$item['cover'];
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
        ])->get(self::BASE_URL."/series/{$slug}", [
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

        // Increase execution time for batch imports
        set_time_limit(300); // 5 minutes

        $slugs = $request->input('slugs');
        $results = [
            'success' => [],
            'failed' => [],
            'skipped' => [],
        ];

        // Check which dramas already exist
        $existingSlugs = Drama::whereIn('slug', $slugs)
            ->pluck('title', 'slug')
            ->toArray();

        $cookie = config('services.dramadunyam.cookie');

        foreach ($slugs as $slug) {
            try {
                // Skip if already in database
                if (isset($existingSlugs[$slug])) {
                    $results['skipped'][] = [
                        'slug' => $slug,
                        'title' => $existingSlugs[$slug],
                        'reason' => 'Already in database',
                    ];

                    continue;
                }

                $response = Http::timeout(15) // Reduced timeout per request
                    ->withHeaders([
                        'Cookie' => $cookie,
                        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ])->get(self::BASE_URL."/series/{$slug}", [
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
                } else {
                    $results['failed'][] = [
                        'slug' => $slug,
                        'reason' => 'API request failed',
                    ];
                }

                // Small delay to avoid overwhelming the API
                usleep(200000); // 200ms delay
            } catch (\Exception $e) {
                $results['failed'][] = [
                    'slug' => $slug,
                    'reason' => $e->getMessage(),
                ];
            }
        }

        $message = count($results['success']).' dramas imported successfully';
        if (count($results['skipped']) > 0) {
            $message .= ', '.count($results['skipped']).' skipped (already in database)';
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'results' => $results,
        ]);
    }
}
