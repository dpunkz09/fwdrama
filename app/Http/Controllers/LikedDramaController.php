<?php

namespace App\Http\Controllers;

use App\Models\Drama;
use App\Models\LikedDrama;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LikedDramaController extends Controller
{
    /**
     * Toggle like for a drama
     */
    public function toggle(Request $request)
    {
        $request->validate([
            'drama_id' => 'required|integer|exists:dramas,id',
            'guest_id' => 'nullable|string',
        ]);

        $dramaId = $request->input('drama_id');
        $drama = Drama::findOrFail($dramaId);
        $userId = $request->user()?->id;
        $guestId = $request->input('guest_id') ?? $request->cookie('guest_id') ?? Str::uuid()->toString();

        // Check if already liked
        $existingLike = LikedDrama::where('drama_id', $dramaId)
            ->where(function ($query) use ($userId, $guestId) {
                if ($userId) {
                    $query->where('user_id', $userId);
                } else {
                    $query->where('guest_id', $guestId);
                }
            })
            ->first();

        if ($existingLike) {
            // Unlike
            $existingLike->delete();
            
            // Decrement like count
            $drama->decrement('like_count');
            
            return response()->json([
                'liked' => false,
                'like_count' => $drama->fresh()->like_count,
            ]);
        } else {
            // Like
            LikedDrama::create([
                'user_id' => $userId,
                'drama_id' => $dramaId,
                'guest_id' => !$userId ? $guestId : null,
            ]);
            
            // Increment like count
            $drama->increment('like_count');
            
            return response()->json([
                'liked' => true,
                'like_count' => $drama->fresh()->like_count,
                'guest_id' => !$userId ? $guestId : null,
            ]);
        }
    }

    /**
     * Check if user/guest has liked a drama
     */
    public function check(Request $request, $dramaId)
    {
        $userId = $request->user()?->id;
        $guestId = $request->input('guest_id') ?? $request->cookie('guest_id');

        $liked = LikedDrama::where('drama_id', $dramaId)
            ->where(function ($query) use ($userId, $guestId) {
                if ($userId) {
                    $query->where('user_id', $userId);
                } else if ($guestId) {
                    $query->where('guest_id', $guestId);
                }
            })
            ->exists();

        $likeCount = Drama::find($dramaId)?->like_count ?? 0;

        return response()->json([
            'liked' => $liked,
            'like_count' => $likeCount,
        ]);
    }

    /**
     * Get like count for a drama (public endpoint)
     */
    public function count($dramaId)
    {
        $drama = Drama::findOrFail($dramaId);

        return response()->json([
            'like_count' => $drama->like_count,
        ]);
    }
}
