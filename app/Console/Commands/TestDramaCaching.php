<?php

namespace App\Console\Commands;

use App\Models\Drama;
use App\Models\DramaCache;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('drama:test-cache')]
#[Description('Test the drama caching system by checking database stats')]
class TestDramaCaching extends Command
{
    public function handle(): int
    {
        $this->info('Drama Caching Statistics');
        $this->newLine();

        $dramaCount = Drama::count();
        $cacheCount = DramaCache::count();

        $this->table(
            ['Metric', 'Value'],
            [
                ['Total Dramas in Database', $dramaCount],
                ['Total Cache Entries', $cacheCount],
            ]
        );

        if ($cacheCount > 0) {
            $this->newLine();
            $this->info('Cache Entries:');
            $caches = DramaCache::orderBy('cached_at', 'desc')->get();

            $cacheData = $caches->map(function ($cache) {
                $itemCount = isset($cache->data['items']) ? count($cache->data['items']) : 0;

                return [
                    $cache->cache_key,
                    $itemCount.' items',
                    $cache->cached_at->diffForHumans(),
                ];
            })->toArray();

            $this->table(
                ['Cache Key', 'Items', 'Cached'],
                $cacheData
            );
        }

        if ($dramaCount > 0) {
            $this->newLine();
            $latestDramas = Drama::orderBy('data_fetched_at', 'desc')->take(5)->get();
            $this->info('Latest 5 Dramas:');

            $dramaData = $latestDramas->map(function ($drama) {
                return [
                    $drama->title,
                    $drama->slug,
                    $drama->data_fetched_at->diffForHumans(),
                ];
            })->toArray();

            $this->table(
                ['Title', 'Slug', 'Last Updated'],
                $dramaData
            );
        }

        return self::SUCCESS;
    }
}
