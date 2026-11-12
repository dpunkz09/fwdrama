<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DramaCache extends Model
{
    protected $table = 'drama_cache';

    protected $fillable = [
        'cache_key',
        'data',
        'cached_at',
    ];

    protected $casts = [
        'data' => 'array',
        'cached_at' => 'datetime',
    ];

    /**
     * Store or update cached data
     */
    public static function store(string $key, array $data): self
    {
        return self::updateOrCreate(
            ['cache_key' => $key],
            [
                'data' => $data,
                'cached_at' => now(),
            ]
        );
    }

    /**
     * Get cached data if not expired
     */
    public static function get(string $key, int $minutesTtl = 60): ?array
    {
        $cache = self::where('cache_key', $key)->first();

        if (! $cache) {
            return null;
        }

        // Check if cache is expired
        if ($cache->cached_at->lt(now()->subMinutes($minutesTtl))) {
            return null;
        }

        return $cache->data;
    }
}
