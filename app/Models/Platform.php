<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Platform extends Model
{
    protected $fillable = [
        'name',
        'logo',
        'yetiskin',
        'on8',
    ];

    protected $casts = [
        'yetiskin' => 'boolean',
        'on8' => 'boolean',
    ];

    /**
     * Get the count of dramas for this platform from the database
     */
    public function getDramaCountAttribute()
    {
        return Drama::where('platform', $this->name)->count();
    }
}
