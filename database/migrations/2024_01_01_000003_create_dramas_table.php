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
        Schema::create('dramas', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique()->comment('External API ID');
            $table->string('slug')->unique()->index()->comment('URL-friendly identifier');
            $table->string('title')->index();
            $table->text('description')->nullable();
            $table->string('cover')->nullable()->comment('Cover image path');
            $table->string('language', 10)->default('en')->index();
            $table->string('platform')->nullable()->index();
            $table->string('genre')->nullable();

            // Episode tracking
            $table->integer('total_episodes')->default(0);
            $table->integer('available_episodes')->default(0);
            $table->integer('episodes_in_db')->default(0);
            $table->integer('source_total')->default(0);
            $table->string('bolum_no')->nullable();

            // Metadata and flags
            $table->boolean('is_new')->default(false);
            $table->boolean('is_popular')->default(false);
            $table->boolean('is_featured')->default(false)->index();
            $table->date('release_date')->nullable();

            // Stats
            $table->bigInteger('views')->default(0);
            $table->bigInteger('view_count')->default(0);
            $table->integer('like_count')->default(0);

            // JSON fields
            $table->json('tags')->nullable();
            $table->json('similar')->nullable();

            $table->timestamps();

            // Composite indexes for common queries
            $table->index(['platform', 'created_at']);
            $table->index(['is_featured', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dramas');
    }
};
