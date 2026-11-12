<?php

namespace App\Http\Controllers;

use App\Models\SavedDrama;
use Illuminate\Http\Request;

class SavedDramaController extends Controller
{
    /**
     * Toggle save status for a drama
     */
    public function toggle(Request $request)
    {
        $validated = $request->validate([
            'drama_id' => 'required|exists:dramas,id',
        ]);

        $user = $request->user();

        if (! $user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $saved = SavedDrama::where('user_id', $user->id)
            ->where('drama_id', $validated['drama_id'])
            ->first();

        if ($saved) {
            // Already saved, remove it
            $saved->delete();
            
            // Invalidate cache
            \Cache::forget("drama_saved_count_{$validated['drama_id']}");
            
            $savedCount = SavedDrama::where('drama_id', $validated['drama_id'])->count();

            return response()->json([
                'success' => true,
                'saved' => false,
                'saved_count' => $savedCount,
                'message' => 'Drama removed from saved list',
            ]);
        } else {
            // Not saved, save it
            SavedDrama::create([
                'user_id' => $user->id,
                'drama_id' => $validated['drama_id'],
            ]);

            // Invalidate cache
            \Cache::forget("drama_saved_count_{$validated['drama_id']}");

            $savedCount = SavedDrama::where('drama_id', $validated['drama_id'])->count();

            return response()->json([
                'success' => true,
                'saved' => true,
                'saved_count' => $savedCount,
                'message' => 'Drama saved successfully',
            ]);
        }
    }

    /**
     * Get saved dramas list
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([]);
        }

        $savedDramas = SavedDrama::with('drama')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'drama_id' => $item->drama_id,
                    'drama' => $item->drama,
                    'saved_at' => $item->created_at,
                ];
            });

        return response()->json($savedDramas);
    }

    /**
     * Check if drama is saved
     */
    public function check(Request $request, $dramaId)
    {
        $user = $request->user();

        $savedCount = SavedDrama::where('drama_id', $dramaId)->count();

        if (! $user) {
            return response()->json([
                'saved' => false,
                'saved_count' => $savedCount,
            ]);
        }

        $saved = SavedDrama::where('user_id', $user->id)
            ->where('drama_id', $dramaId)
            ->exists();

        return response()->json([
            'saved' => $saved,
            'saved_count' => $savedCount,
        ]);
    }

    /**
     * Get save count for a drama (public)
     */
    public function count($dramaId)
    {
        $count = SavedDrama::where('drama_id', $dramaId)->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Delete a saved drama
     */
    public function destroy(Request $request, $dramaId)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $deleted = SavedDrama::where('user_id', $user->id)
            ->where('drama_id', $dramaId)
            ->delete();

        if ($deleted) {
            // Invalidate cache
            \Cache::forget("drama_saved_count_{$dramaId}");
            
            $savedCount = SavedDrama::where('drama_id', $dramaId)->count();

            return response()->json([
                'success' => true,
                'saved_count' => $savedCount,
                'message' => 'Drama removed from saved list',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Drama not found in saved list',
        ], 404);
    }
}
