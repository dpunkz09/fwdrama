<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('watch_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('drama_id')->constrained()->onDelete('cascade');
            $table->integer('last_episode')->default(1)->comment('Last watched episode number');
            $table->integer('progress_seconds')->default(0)->comment('Progress within the episode in seconds');
            $table->timestamps();

            // Unique constraint: one history record per user per drama
            $table->unique(['user_id', 'drama_id']);

            // Indexes for efficient queries
            $table->index('user_id');
            $table->index(['user_id', 'updated_at']); // For continue watching sorted by recent
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('watch_history');
    }
};
