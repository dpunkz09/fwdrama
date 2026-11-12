<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WatchHistory extends Model
{
    protected $table = 'watch_history';

    protected $fillable = [
        'user_id',
        'drama_id',
        'last_episode',
        'progress_seconds',
    ];

    protected $casts = [
        'last_episode' => 'integer',
        'progress_seconds' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function drama(): BelongsTo
    {
        return $this->belongsTo(Drama::class);
    }
}
