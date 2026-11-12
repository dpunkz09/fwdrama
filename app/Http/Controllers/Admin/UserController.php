<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of users with stats
     */
    public function index(Request $request)
    {
        $query = User::query();

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter by role
        $role = $request->input('role');
        if ($role === 'admin') {
            $query->where('is_admin', true);
        } elseif ($role === 'user') {
            $query->where('is_admin', false);
        }

        // Filter by verification status
        $verified = $request->input('verified');
        if ($verified === 'verified') {
            $query->whereNotNull('email_verified_at');
        } elseif ($verified === 'unverified') {
            $query->whereNull('email_verified_at');
        }

        // Sort
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        // Paginate
        $users = $query->paginate(20)->withQueryString();

        // Add user stats
        $users->getCollection()->transform(function ($user) {
            $user->saved_dramas_count = $user->savedDramas()->count();
            $user->watch_history_count = $user->watchHistory()->count();
            $user->liked_dramas_count = \App\Models\LikedDrama::where('user_id', $user->id)->count();

            return $user;
        });

        // Stats
        $stats = [
            'total_users' => User::count(),
            'verified_users' => User::whereNotNull('email_verified_at')->count(),
            'admin_users' => User::where('is_admin', true)->count(),
            'new_users_today' => User::where('created_at', '>=', now()->subDay())->count(),
        ];

        return Inertia::render('admin/users', [
            'users' => $users,
            'stats' => $stats,
            'filters' => [
                'search' => $search,
                'role' => $role,
                'verified' => $verified,
                'sort_by' => $sortBy,
                'sort_dir' => $sortDir,
            ],
        ]);
    }

    /**
     * Show user details
     */
    public function show($id)
    {
        $user = User::with(['savedDramas.drama', 'watchHistory.drama'])
            ->findOrFail($id);

        $user->saved_dramas_count = $user->savedDramas()->count();
        $user->watch_history_count = $user->watchHistory()->count();
        $user->liked_dramas_count = \App\Models\LikedDrama::where('user_id', $user->id)->count();

        // Get user's most watched dramas
        $mostWatchedDramas = $user->watchHistory()
            ->with('drama:id,title,slug,cover')
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get();

        // Get recently saved dramas
        $recentlySavedDramas = $user->savedDramas()
            ->with('drama:id,title,slug,cover')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return Inertia::render('admin/users/show', [
            'user' => $user,
            'mostWatchedDramas' => $mostWatchedDramas,
            'recentlySavedDramas' => $recentlySavedDramas,
        ]);
    }

    /**
     * Toggle admin status
     */
    public function toggleAdmin(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Prevent removing your own admin status
        if ($user->id === $request->user()->id && $user->is_admin) {
            return back()->with('error', 'You cannot remove your own admin privileges.');
        }

        $user->is_admin = ! $user->is_admin;
        $user->save();

        return back()->with('success', $user->is_admin
            ? 'User granted admin privileges.'
            : 'User admin privileges revoked.');
    }

    /**
     * Verify user email
     */
    public function verifyEmail($id)
    {
        $user = User::findOrFail($id);

        if ($user->email_verified_at) {
            return back()->with('info', 'User email is already verified.');
        }

        $user->email_verified_at = now();
        $user->save();

        return back()->with('success', 'User email verified successfully.');
    }

    /**
     * Reset user password
     */
    public function resetPassword(Request $request, $id)
    {
        $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::findOrFail($id);

        // Prevent resetting your own password this way
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Please use the profile settings to change your own password.');
        }

        $user->password = Hash::make($request->password);
        $user->save();

        return back()->with('success', 'User password reset successfully.');
    }

    /**
     * Delete user
     */
    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Prevent self-deletion
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        // Delete related data
        $user->savedDramas()->delete();
        $user->watchHistory()->delete();
        \App\Models\LikedDrama::where('user_id', $user->id)->delete();

        $user->delete();

        return redirect()->route('admin.users.index')
            ->with('success', 'User and all related data deleted successfully.');
    }

    /**
     * Bulk actions
     */
    public function bulkAction(Request $request)
    {
        $request->validate([
            'action' => ['required', Rule::in(['delete', 'verify', 'make_admin', 'remove_admin'])],
            'user_ids' => ['required', 'array'],
            'user_ids.*' => ['exists:users,id'],
        ]);

        $userIds = $request->input('user_ids');
        $action = $request->input('action');

        // Prevent bulk actions on yourself
        if (in_array($request->user()->id, $userIds)) {
            return back()->with('error', 'You cannot perform bulk actions on your own account.');
        }

        $count = 0;

        switch ($action) {
            case 'delete':
                $count = User::whereIn('id', $userIds)->delete();
                \App\Models\SavedDrama::whereIn('user_id', $userIds)->delete();
                \App\Models\WatchHistory::whereIn('user_id', $userIds)->delete();
                \App\Models\LikedDrama::whereIn('user_id', $userIds)->delete();
                break;

            case 'verify':
                $count = User::whereIn('id', $userIds)
                    ->whereNull('email_verified_at')
                    ->update(['email_verified_at' => now()]);
                break;

            case 'make_admin':
                $count = User::whereIn('id', $userIds)
                    ->where('is_admin', false)
                    ->update(['is_admin' => true]);
                break;

            case 'remove_admin':
                $count = User::whereIn('id', $userIds)
                    ->where('is_admin', true)
                    ->update(['is_admin' => false]);
                break;
        }

        return back()->with('success', "Bulk action completed. {$count} user(s) affected.");
    }
}
