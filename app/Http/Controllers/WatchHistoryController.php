<?php

namespace App\Http\Controllers;

use App\Models\WatchHistory;
use Illuminate\Http\Request;

class WatchHistoryController extends Controller
{
    /**
     * Update or create watch history for authenticated user
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'drama_id' => 'required|exists:dramas,id',
            'episode' => 'required|integer|min:1',
            'progress_seconds' => 'nullable|integer|min:0',
        ]);

        $user = $request->user();

        if (! $user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $watchHistory = WatchHistory::updateOrCreate(
            [
                'user_id' => $user->id,
                'drama_id' => $validated['drama_id'],
            ],
            [
                'last_episode' => $validated['episode'],
                'progress_seconds' => $validated['progress_seconds'] ?? 0,
            ]
        );

        // Increment view count only on first watch (when record was just created)
        if ($watchHistory->wasRecentlyCreated) {
            \App\Models\Drama::where('id', $validated['drama_id'])->increment('view_count');
        }

        return response()->json(['success' => true]);
    }

    /**
     * Get continue watching list for authenticated user
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([]);
        }

        $history = WatchHistory::with('drama')
            ->where('user_id', $user->id)
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'drama_id' => $item->drama_id,
                    'drama' => $item->drama,
                    'last_episode' => $item->last_episode,
                    'progress_seconds' => $item->progress_seconds,
                    'updated_at' => $item->updated_at,
                ];
            });

        return response()->json($history);
    }

    /**
     * Delete a watch history entry
     */
    public function destroy(Request $request, $dramaId)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $deleted = WatchHistory::where('user_id', $user->id)
            ->where('drama_id', $dramaId)
            ->delete();

        if ($deleted) {
            return response()->json([
                'success' => true,
                'message' => 'Watch history entry removed',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Watch history entry not found',
        ], 404);
    }

    /**
     * Increment view count (public endpoint for guests)
     */
    public function incrementView(Request $request)
    {
        $validated = $request->validate([
            'drama_id' => 'required|exists:dramas,id',
            'guest_id' => 'nullable|string',
        ]);

        // Use a cache key to prevent duplicate counts from the same guest within 24 hours
        $guestId = $validated['guest_id'] ?? $request->ip();
        $cacheKey = "view_counted_{$validated['drama_id']}_{$guestId}";

        // Check if this guest has already been counted today
        if (!\Cache::has($cacheKey)) {
            \App\Models\Drama::where('id', $validated['drama_id'])->increment('view_count');
            
            // Mark as counted for 24 hours
            \Cache::put($cacheKey, true, now()->addHours(24));
            
            return response()->json([
                'success' => true,
                'message' => 'View counted',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Already counted',
        ]);
    }
}
