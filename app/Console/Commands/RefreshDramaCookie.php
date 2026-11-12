<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

#[Signature('drama:refresh-cookie')]
#[Description('Refresh the dramadunyam.com authentication cookie using browser automation')]
class RefreshDramaCookie extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting cookie refresh process...');

        $scriptPath = base_path('cookie-fetcher.js');

        if (! File::exists($scriptPath)) {
            $this->error('Cookie fetcher script not found at: '.$scriptPath);

            return self::FAILURE;
        }

        $this->info('Running browser automation script...');

        // Execute the Node.js script
        $output = [];
        $returnCode = 0;
        exec('node '.escapeshellarg($scriptPath).' 2>&1', $output, $returnCode);

        if ($returnCode !== 0) {
            $this->error('Failed to execute cookie fetcher script:');
            $this->line(implode("\n", $output));

            return self::FAILURE;
        }

        // Parse the output to find the cookie value
        $cookieValue = null;
        foreach ($output as $line) {
            $this->line($line);
            if (str_starts_with($line, 'DRAMADUNYAM_COOKIE=')) {
                $cookieValue = substr($line, strlen('DRAMADUNYAM_COOKIE='));
            }
        }

        if (! $cookieValue) {
            $this->error('Cookie value not found in script output');

            return self::FAILURE;
        }

        // Update the .env file
        $envPath = base_path('.env');
        if (! File::exists($envPath)) {
            $this->error('.env file not found');

            return self::FAILURE;
        }

        $envContent = File::get($envPath);

        // Check if DRAMADUNYAM_COOKIE exists
        if (str_contains($envContent, 'DRAMADUNYAM_COOKIE=')) {
            // Replace existing value (with proper quoting)
            $envContent = preg_replace(
                '/DRAMADUNYAM_COOKIE=.*$/m',
                'DRAMADUNYAM_COOKIE="'.$cookieValue.'"',
                $envContent
            );
        } else {
            // Append new value (with proper quoting)
            $envContent .= "\nDRAMADUNYAM_COOKIE=\"".$cookieValue."\"\n";
        }

        File::put($envPath, $envContent);

        $this->info('✓ Cookie successfully refreshed and saved to .env');
        $this->info('The new cookie will be used on the next request.');
        $this->newLine();
        $this->comment('Note: You may need to restart your development server for the change to take effect.');

        return self::SUCCESS;
    }
}
