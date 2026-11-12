<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Drama;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DramaController extends Controller
{
    public function index(Request $request)
    {
        $query = Drama::query();

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('platform', 'like', "%{$search}%");
            });
        }

        // Filter by platform
        if ($platform = $request->input('platform')) {
            $query->where('platform', $platform);
        }

        // Filter by status
        if ($request->has('is_new')) {
            $query->where('is_new', (bool) $request->input('is_new'));
        }

        if ($request->has('is_popular')) {
            $query->where('is_popular', (bool) $request->input('is_popular'));
        }

        if ($request->has('is_featured')) {
            $query->where('is_featured', (bool) $request->input('is_featured'));
        }

        // Sort
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Paginate
        $dramas = $query->paginate(20)->withQueryString();

        // Get all unique platforms for filter
        $platforms = Drama::distinct()->pluck('platform')->filter()->values();

        return Inertia::render('admin/dramas', [
            'dramas' => $dramas,
            'platforms' => $platforms,
            'filters' => $request->only(['search', 'platform', 'is_new', 'is_popular', 'is_featured', 'sort_by', 'sort_order']),
        ]);
    }

    public function destroy($id)
    {
        $drama = Drama::findOrFail($id);
        $drama->delete();

        return response()->json([
            'success' => true,
            'message' => "Drama '{$drama->title}' deleted successfully",
        ]);
    }

    public function toggleFeature($id)
    {
        $drama = Drama::findOrFail($id);
        $drama->is_featured = ! $drama->is_featured;
        $drama->save();

        return response()->json([
            'success' => true,
            'is_featured' => $drama->is_featured,
            'message' => $drama->is_featured ? 'Drama featured' : 'Drama unfeatured',
        ]);
    }

    public function togglePopular($id)
    {
        $drama = Drama::findOrFail($id);
        $drama->is_popular = ! $drama->is_popular;
        $drama->save();

        return response()->json([
            'success' => true,
            'is_popular' => $drama->is_popular,
            'message' => $drama->is_popular ? 'Marked as popular' : 'Unmarked as popular',
        ]);
    }
}
