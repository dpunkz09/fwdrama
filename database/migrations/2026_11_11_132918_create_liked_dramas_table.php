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
        Schema::create('liked_dramas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('drama_id')->constrained()->onDelete('cascade');
            $table->string('guest_id')->nullable()->index();
            $table->timestamps();

            // Ensure a user/guest can only like a drama once
            $table->unique(['user_id', 'drama_id']);
            $table->unique(['guest_id', 'drama_id']);
            
            $table->index(['drama_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('liked_dramas');
    }
};
