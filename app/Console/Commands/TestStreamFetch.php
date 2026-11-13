<?php

namespace App\Console\Commands;

use App\Models\Drama;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class TestStreamFetch extends Command
{
    protected $signature = 'drama:test-stream {slug} {episode=1}';

    protected $description = 'Test fetching stream data for a drama';

    public function handle()
    {
        $slug = $this->argument('slug');
        $episode = $this->argument('episode');

        $this->info("Testing stream fetch for: {$slug} episode {$episode}");
        $this->newLine();

        // Get drama
        $drama = Drama::where('slug', $slug)->first();

        if (! $drama) {
            $this->error("Drama not found with slug: {$slug}");

            return 1;
        }

        $this->info('Drama found:');
        $this->table(
            ['Field', 'Value'],
            [
                ['ID', $drama->id],
                ['Title', $drama->title],
                ['Slug', $drama->slug],
                ['External ID', $drama->external_id ?? '(empty)'],
                ['Total Episodes', $drama->total_episodes],
                ['Available Episodes', $drama->available_episodes],
            ]
        );

        $this->newLine();

        if (empty($drama->external_id)) {
            $this->error('Drama is missing external_id!');

            return 1;
        }

        $apiUrl = config('services.dramadunyam.url')."/play/{$drama->external_id}/{$episode}";
        $this->info("API URL: {$apiUrl}");
        $this->newLine();

        $cookie = config('services.dramadunyam.cookie');

        if (empty($cookie)) {
            $this->error('Missing DramaDunyam cookie configuration!');
            $this->info('Please set DRAMADUNYAM_COOKIE in your .env file');

            return 1;
        }

        $this->info('✓ Cookie configuration found');
        $this->newLine();

        try {
            $this->info('Sending HTTP request with authentication...');
            $response = Http::timeout(10)
                ->withHeaders([
                    'Cookie' => $cookie,
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer' => config('services.dramadunyam.url').'/',
                    'Accept' => 'application/json',
                ])
                ->get($apiUrl);

            $this->info("HTTP Status: {$response->status()}");
            $this->newLine();

            if ($response->successful()) {
                $this->info('✓ Request successful!');
                $this->newLine();

                $data = $response->json();

                $this->info('Response data:');
                $this->line(json_encode($data, JSON_PRETTY_PRINT));
                $this->newLine();

                $this->table(
                    ['Field', 'Value'],
                    [
                        ['Type', $data['type'] ?? 'N/A'],
                        ['Delivery', $data['delivery'] ?? 'N/A'],
                        ['Source Tag', $data['source_tag'] ?? 'N/A'],
                        ['Has URL', isset($data['url']) ? 'Yes' : 'No'],
                        ['Subtitle Count', isset($data['altyazilar']) ? count($data['altyazilar']) : 0],
                        ['Expires At', $data['expires_at'] ?? 'N/A'],
                    ]
                );

                $this->newLine();
                $this->info('✓ Stream data fetched successfully!');

                return 0;
            } else {
                $this->error("✗ Request failed with status: {$response->status()}");
                $this->newLine();
                $this->error('Response body:');
                $this->line($response->body());

                return 1;
            }
        } catch (ConnectionException $e) {
            $this->error('✗ Connection error:');
            $this->error($e->getMessage());

            return 1;
        } catch (\Exception $e) {
            $this->error('✗ Unexpected error:');
            $this->error($e->getMessage());
            $this->newLine();
            $this->error('Stack trace:');
            $this->line($e->getTraceAsString());

            return 1;
        }
    }
}
