<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CoverImageService
{
    /**
     * Download and save cover image locally
     */
    public static function downloadAndSave(string $url, string $slug): ?string
    {
        if (empty($url)) {
            return null;
        }

        // Handle relative URLs
        if (str_starts_with($url, '/')) {
            $url = config('services.dramadunyam.url').$url;
        }

        // If it's already a local storage URL, return as is
        if (str_contains($url, '/storage/covers/')) {
            return $url;
        }

        try {
            // Create a unique filename based on slug and original extension
            $extension = pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'webp';
            $filename = Str::slug($slug).'.'.$extension;
            $path = 'covers/'.$filename;

            // Check if file already exists
            if (Storage::disk('public')->exists($path)) {
                return Storage::url($path);
            }

            // Download the image
            $response = Http::timeout(30)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer' => config('services.dramadunyam.url').'/',
                ])
                ->get($url);

            if ($response->successful()) {
                // Save to storage/app/public/covers
                Storage::disk('public')->put($path, $response->body());

                return Storage::url($path);
            }

            return $url; // Fallback to original URL
        } catch (\Exception $e) {
            \Log::error('Failed to download cover image', [
                'url' => $url,
                'slug' => $slug,
                'error' => $e->getMessage(),
            ]);

            return $url; // Fallback to original URL
        }
    }

    /**
     * Delete cover images for a drama
     */
    public static function deleteCoverImages(string $slug): void
    {
        try {
            $files = Storage::disk('public')->files('covers');

            foreach ($files as $file) {
                if (str_contains($file, Str::slug($slug))) {
                    Storage::disk('public')->delete($file);
                }
            }
        } catch (\Exception $e) {
            \Log::error('Failed to delete cover images', [
                'slug' => $slug,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
