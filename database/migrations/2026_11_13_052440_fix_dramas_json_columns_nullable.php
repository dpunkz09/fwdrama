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
        Schema::table('dramas', function (Blueprint $table) {
            // Make JSON columns nullable to fix "Array to string conversion" error
            $table->json('tags')->nullable()->change();
            $table->json('similar')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dramas', function (Blueprint $table) {
            $table->json('tags')->nullable(false)->change();
            $table->json('similar')->nullable(false)->change();
        });
    }
};
