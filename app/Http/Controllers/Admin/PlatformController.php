<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Platform;
use App\Services\CoverImageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PlatformController extends Controller
{
    public function index()
    {
        $platforms = Platform::orderBy('name')->get();

        // Add drama count to each platform
        $platforms->each(function ($platform) {
            $platform->drama_count = $platform->drama_count;
        });

        return Inertia::render('admin/platforms', [
            'platforms' => $platforms,
        ]);
    }

    public function import(Request $request)
    {
        try {
            \Log::info('Starting platform import');

            $cookie = config('services.dramadunyam.cookie');

            if (empty($cookie)) {
                return back()->with('error', 'DramaDunyam cookie not configured. Please set DRAMADUNYAM_COOKIE in .env');
            }

            $response = Http::timeout(30)
                ->withHeaders([
                    'Cookie' => $cookie,
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept' => 'application/json',
                    'Referer' => 'https://dramadunyam.com/',
                ])
                ->get('https://dramadunyam.com/api/platforms', [
                    'lang' => 'en',
                ]);

            \Log::info('Platform API response', [
                'status' => $response->status(),
                'body_length' => strlen($response->body()),
            ]);

            if (! $response->successful()) {
                \Log::error('Platform API failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return back()->with('error', 'Failed to fetch platforms from API: '.$response->body());
            }

            $platforms = $response->json();

            if (! is_array($platforms)) {
                \Log::error('Invalid platform response', ['response' => $platforms]);

                return back()->with('error', 'Invalid response from API');
            }

            $imported = 0;
            $updated = 0;

            foreach ($platforms as $platformData) {
                // Download logo if available
                $localLogo = null;
                if (! empty($platformData['logo'])) {
                    $slug = Str::slug($platformData['name']);
                    // Use CoverImageService but save to platforms directory
                    $localLogo = $this->downloadPlatformLogo($platformData['logo'], $slug);
                }

                $platform = Platform::updateOrCreate(
                    ['name' => $platformData['name']],
                    [
                        'logo' => $localLogo ?? $platformData['logo'] ?? null,
                        'yetiskin' => $platformData['yetiskin'] ?? false,
                        'on8' => $platformData['on8'] ?? false,
                    ]
                );

                if ($platform->wasRecentlyCreated) {
                    $imported++;
                } else {
                    $updated++;
                }
            }

            \Log::info('Platform import completed', [
                'imported' => $imported,
                'updated' => $updated,
            ]);

            return back()->with('success', "Imported {$imported} new platforms and updated {$updated} existing platforms.");
        } catch (\Exception $e) {
            \Log::error('Platform import failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return back()->with('error', 'Failed to import platforms: '.$e->getMessage());
        }
    }

    /**
     * Download platform logo and save locally
     */
    private function downloadPlatformLogo(string $url, string $slug): ?string
    {
        if (empty($url)) {
            return null;
        }

        // Handle relative URLs
        if (str_starts_with($url, '/')) {
            $url = 'https://dramadunyam.com'.$url;
        }

        // If it's already a local storage URL, return as is
        if (str_contains($url, '/storage/platforms/')) {
            return $url;
        }

        try {
            // Create a unique filename based on slug and original extension
            $extension = pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'webp';
            $filename = Str::slug($slug).'.'.$extension;
            $path = 'platforms/'.$filename;

            // Check if file already exists
            if (\Storage::disk('public')->exists($path)) {
                return \Storage::url($path);
            }

            // Download the image
            $response = Http::timeout(30)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer' => 'https://dramadunyam.com/',
                ])
                ->get($url);

            if ($response->successful()) {
                // Save to storage/app/public/platforms
                \Storage::disk('public')->put($path, $response->body());

                \Log::info('Platform logo downloaded', [
                    'platform' => $slug,
                    'path' => $path,
                ]);

                return \Storage::url($path);
            }

            return $url; // Fallback to original URL
        } catch (\Exception $e) {
            \Log::error('Failed to download platform logo', [
                'url' => $url,
                'slug' => $slug,
                'error' => $e->getMessage(),
            ]);

            return $url; // Fallback to original URL
        }
    }

    public function destroy($id)
    {
        try {
            $platform = Platform::findOrFail($id);
            $platform->delete();

            return back()->with('success', 'Platform deleted successfully');
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to delete platform');
        }
    }
}
