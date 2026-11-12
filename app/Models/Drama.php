<?php

namespace App\Models;

use App\Services\CoverImageService;
use Illuminate\Database\Eloquent\Model;

class Drama extends Model
{
    protected $fillable = [
        'external_id',
        'slug',
        'title',
        'language',
        'cover',
        'platform',
        'total_episodes',
        'available_episodes',
        'is_new',
        'is_popular',
        'description',
        'genre',
        'views',
        'is_featured',
        'release_date',
        'view_count',
        'source_total',
        'tags',
        'episodes_in_db',
        'bolum_no',
        'similar',
        'like_count',
    ];

    protected $casts = [
        'is_new' => 'boolean',
        'is_popular' => 'boolean',
        'is_featured' => 'boolean',
        'tags' => 'array',
        'similar' => 'array',
        'release_date' => 'date',
        'views' => 'integer',
        'view_count' => 'integer',
        'total_episodes' => 'integer',
        'available_episodes' => 'integer',
        'source_total' => 'integer',
        'episodes_in_db' => 'integer',
        'like_count' => 'integer',
    ];

    /**
     * Create or update drama from API data
     */
    public static function createOrUpdateFromApi(array $data): self
    {
        // Download and save cover image locally
        $localCover = null;

        if (! empty($data['cover'])) {
            $localCover = CoverImageService::downloadAndSave($data['cover'], $data['slug']);
        }

        // Normalize tags to be an array of strings
        $tags = [];
        if (isset($data['tags']) && is_array($data['tags'])) {
            $tags = collect($data['tags'])->map(function ($tag) {
                if (is_array($tag) && isset($tag['name'])) {
                    return $tag['name'];
                }
                if (is_object($tag) && isset($tag->name)) {
                    return $tag->name;
                }

                return is_string($tag) ? $tag : null;
            })->filter()->values()->toArray();
        }

        return self::updateOrCreate(
            ['external_id' => $data['id']],
            [
                'slug' => $data['slug'],
                'title' => $data['title'],
                'language' => $data['language'] ?? 'en',
                'cover' => $localCover ?? $data['cover'] ?? null,
                'platform' => $data['platform'] ?? null,
                'total_episodes' => $data['total_episodes'] ?? 0,
                'available_episodes' => $data['available_episodes'] ?? 0,
                'is_new' => $data['is_new'] ?? false,
                'is_popular' => $data['is_popular'] ?? false,
                'description' => $data['description'] ?? null,
                'genre' => $data['genre'] ?? null,
                'views' => $data['views'] ?? 0,
                'is_featured' => $data['is_featured'] ?? false,
                'release_date' => $data['release_date'] ?? null,
                // Note: view_count is NOT imported - we manage our own view counts starting from 0
                'source_total' => $data['source_total'] ?? 0,
                'tags' => $tags,
                'episodes_in_db' => $data['episodes_in_db'] ?? 0,
                'bolum_no' => $data['bolum_no'] ?? null,
                'similar' => $data['similar'] ?? [],
                // Note: like_count is NOT imported - we manage our own likes starting from 0
            ]
        );
    }

    /**
     * Get saved dramas relationship
     */
    public function savedBy()
    {
        return $this->hasMany(SavedDrama::class);
    }

    /**
     * Delete drama and its cover images
     */
    protected static function booted(): void
    {
        static::deleting(function (Drama $drama) {
            CoverImageService::deleteCoverImages($drama->slug);
        });
    }
}
