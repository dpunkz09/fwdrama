<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LikedDrama extends Model
{
    protected $fillable = [
        'user_id',
        'drama_id',
        'guest_id',
    ];

    /**
     * Get the user that liked the drama
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the drama that was liked
     */
    public function drama(): BelongsTo
    {
        return $this->belongsTo(Drama::class);
    }
}
