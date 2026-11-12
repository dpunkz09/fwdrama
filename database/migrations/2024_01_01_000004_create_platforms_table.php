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
        Schema::create('platforms', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique()->index();
            $table->string('logo')->nullable();
            $table->integer('drama_count')->default(0)->comment('Cached count of dramas');
            $table->boolean('yetiskin')->default(false)->comment('Adult content flag');
            $table->boolean('on8')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platforms');
    }
};
