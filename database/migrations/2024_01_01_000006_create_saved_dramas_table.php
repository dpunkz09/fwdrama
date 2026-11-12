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
        Schema::create('saved_dramas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('drama_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            // Unique constraint: one save per user per drama
            $table->unique(['user_id', 'drama_id']);

            // Indexes for efficient queries
            $table->index('user_id');
            $table->index('drama_id'); // For counting saves per drama
            $table->index(['user_id', 'created_at']); // For user's saved list sorted by date
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saved_dramas');
    }
};
