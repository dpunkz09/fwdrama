<?php

namespace App\Jobs;

use App\Models\Drama;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ImportDramaBatch implements ShouldQueue
{
    use Queueable;

    public string $batchId;

    public array $slugs;

    /**
     * The number of seconds the job can run before timing out.
     */
    public $timeout = 3600; // 1 hour

    /**
     * Create a new job instance.
     */
    public function __construct(string $batchId, array $slugs)
    {
        $this->batchId = $batchId;
        $this->slugs = $slugs;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $total = count($this->slugs);
        $processed = 0;
        $results = [
            'success' => [],
            'failed' => [],
            'skipped' => [],
        ];

        // Update status to running
        $this->updateProgress([
            'status' => 'running',
            'current' => 0,
            'total' => $total,
            'message' => "Starting import of {$total} dramas...",
            'results' => $results,
            'started_at' => now()->toISOString(),
        ]);

        // Check which dramas already exist
        $existingSlugs = Drama::whereIn('slug', $this->slugs)
            ->pluck('title', 'slug')
            ->toArray();

        $cookie = config('services.dramadunyam.cookie');
        $baseUrl = config('services.dramadunyam.api_base_url');

        foreach ($this->slugs as $slug) {
            $processed++;

            try {
                // Skip if already in database
                if (isset($existingSlugs[$slug])) {
                    $results['skipped'][] = [
                        'slug' => $slug,
                        'title' => $existingSlugs[$slug],
                        'reason' => 'Already in database',
                    ];

                    $this->updateProgress([
                        'status' => 'running',
                        'current' => $processed,
                        'total' => $total,
                        'message' => "Skipped: {$existingSlugs[$slug]} (already in database)",
                        'current_slug' => $slug,
                        'current_status' => 'skipped',
                        'results' => $results,
                    ]);

                    continue;
                }

                // Update progress - fetching
                $this->updateProgress([
                    'status' => 'running',
                    'current' => $processed,
                    'total' => $total,
                    'message' => "Fetching data for {$slug}...",
                    'current_slug' => $slug,
                    'current_status' => 'fetching',
                    'results' => $results,
                ]);

                $response = Http::timeout(15)
                    ->withHeaders([
                        'Cookie' => $cookie,
                        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ])->get($baseUrl."/series/{$slug}", [
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

                    $this->updateProgress([
                        'status' => 'running',
                        'current' => $processed,
                        'total' => $total,
                        'message' => "✓ Imported: {$drama->title}",
                        'current_slug' => $slug,
                        'current_status' => 'success',
                        'results' => $results,
                    ]);
                } else {
                    $results['failed'][] = [
                        'slug' => $slug,
                        'reason' => 'API request failed',
                    ];

                    $this->updateProgress([
                        'status' => 'running',
                        'current' => $processed,
                        'total' => $total,
                        'message' => "✗ Failed: {$slug} (API request failed)",
                        'current_slug' => $slug,
                        'current_status' => 'failed',
                        'results' => $results,
                    ]);
                }

                // Small delay to avoid overwhelming the API
                usleep(200000); // 200ms
            } catch (\Exception $e) {
                $results['failed'][] = [
                    'slug' => $slug,
                    'reason' => $e->getMessage(),
                ];

                $this->updateProgress([
                    'status' => 'running',
                    'current' => $processed,
                    'total' => $total,
                    'message' => "✗ Failed: {$slug} ({$e->getMessage()})",
                    'current_slug' => $slug,
                    'current_status' => 'failed',
                    'results' => $results,
                ]);
            }
        }

        // Mark as completed
        $message = count($results['success']).' dramas imported successfully';
        if (count($results['skipped']) > 0) {
            $message .= ', '.count($results['skipped']).' skipped';
        }
        if (count($results['failed']) > 0) {
            $message .= ', '.count($results['failed']).' failed';
        }

        $this->updateProgress([
            'status' => 'completed',
            'current' => $total,
            'total' => $total,
            'message' => $message,
            'results' => $results,
            'completed_at' => now()->toISOString(),
        ]);
    }

    /**
     * Update progress in cache
     */
    private function updateProgress(array $data): void
    {
        Cache::put("drama_import:{$this->batchId}", $data, now()->addHours(24));
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        $this->updateProgress([
            'status' => 'failed',
            'message' => 'Import job failed: '.$exception->getMessage(),
            'error' => $exception->getMessage(),
            'failed_at' => now()->toISOString(),
        ]);
    }
}
