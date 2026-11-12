<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\DramaImportController;
use App\Http\Controllers\DramaController;
use App\Http\Controllers\LikedDramaController;
use App\Http\Controllers\SavedDramaController;
use App\Http\Controllers\WatchHistoryController;
use Illuminate\Support\Facades\Route;

// Public Drama Routes
Route::get('/', [DramaController::class, 'index'])->name('home');
Route::get('/watch-history', fn () => inertia('watch-history'))->name('watch-history');
Route::get('/saved', fn () => inertia('saved-dramas'))->name('saved-dramas');
Route::get('/platforms', [DramaController::class, 'platforms'])->name('platforms');
Route::get('/platforms/{platformName}', [DramaController::class, 'platformShow'])->name('platforms.show');
Route::get('/drama/{slug}', [DramaController::class, 'show'])->name('dramas.show');
Route::get('/drama/{slug}/watch/{episode}', [DramaController::class, 'watch'])->name('dramas.watch');

// API endpoint for fetching stream data (used for client-side retries)
Route::get('/api/drama/{slug}/stream/{episode}', [DramaController::class, 'getStream'])->name('dramas.stream');

// HLS proxy endpoint (for adding cookies to HLS requests)
Route::get('/api/proxy/hls', [DramaController::class, 'proxyHls'])->name('drama.proxy-hls');

// API endpoint to fetch drama by ID (for guest watch history)
Route::get('/api/dramas/{id}', [DramaController::class, 'getDramaById'])->name('dramas.get-by-id');

// Watch history endpoints
Route::middleware('auth')->group(function () {
    Route::post('/api/watch-history', [WatchHistoryController::class, 'update'])->name('watch-history.update');
    Route::get('/api/watch-history', [WatchHistoryController::class, 'index'])->name('watch-history.index');
    Route::delete('/api/watch-history/{dramaId}', [WatchHistoryController::class, 'destroy'])->name('watch-history.destroy');

    // Saved dramas endpoints
    Route::post('/api/saved-dramas/toggle', [SavedDramaController::class, 'toggle'])->name('saved-dramas.toggle');
    Route::get('/api/saved-dramas', [SavedDramaController::class, 'index'])->name('saved-dramas.index');
    Route::get('/api/saved-dramas/{dramaId}/check', [SavedDramaController::class, 'check'])->name('saved-dramas.check');
    Route::delete('/api/saved-dramas/{dramaId}', [SavedDramaController::class, 'destroy'])->name('saved-dramas.destroy');
});

// Public view increment endpoint (for guests)
Route::post('/api/dramas/increment-view', [WatchHistoryController::class, 'incrementView'])->name('dramas.increment-view');

// Public saved count endpoint (no auth required)
Route::get('/api/saved-dramas/{dramaId}/count', [SavedDramaController::class, 'count'])->name('saved-dramas.count');

// Liked dramas endpoints (supports both auth and guest)
Route::post('/api/liked-dramas/toggle', [LikedDramaController::class, 'toggle'])->name('liked-dramas.toggle');
Route::get('/api/liked-dramas/{dramaId}/check', [LikedDramaController::class, 'check'])->name('liked-dramas.check');
Route::get('/api/liked-dramas/{dramaId}/count', [LikedDramaController::class, 'count'])->name('liked-dramas.count');

Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/live-stats', [AdminDashboardController::class, 'liveStats'])->name('dashboard.live-stats');

    // Drama Management Routes
    Route::get('/dramas', [Admin\DramaController::class, 'index'])->name('dramas');
    Route::delete('/dramas/{id}', [Admin\DramaController::class, 'destroy'])->name('dramas.destroy');
    Route::post('/dramas/{id}/toggle-feature', [Admin\DramaController::class, 'toggleFeature'])->name('dramas.toggle-feature');
    Route::post('/dramas/{id}/toggle-popular', [Admin\DramaController::class, 'togglePopular'])->name('dramas.toggle-popular');

    // Drama Import Routes
    Route::get('/import', [DramaImportController::class, 'index'])->name('import');
    Route::post('/import/fetch-list', [DramaImportController::class, 'fetchList'])->name('import.fetch-list');
    Route::post('/import/single', [DramaImportController::class, 'import'])->name('import.single');
    Route::post('/import/batch', [DramaImportController::class, 'batchImport'])->name('import.batch');

    // Platform Management Routes
    Route::get('/platforms', [Admin\PlatformController::class, 'index'])->name('platforms');
    Route::post('/platforms/import', [Admin\PlatformController::class, 'import'])->name('platforms.import');
    Route::delete('/platforms/{id}', [Admin\PlatformController::class, 'destroy'])->name('platforms.destroy');

    // User Management Routes
    Route::get('/users', [Admin\UserController::class, 'index'])->name('users.index');
    Route::get('/users/{id}', [Admin\UserController::class, 'show'])->name('users.show');
    Route::post('/users/{id}/toggle-admin', [Admin\UserController::class, 'toggleAdmin'])->name('users.toggle-admin');
    Route::post('/users/{id}/verify-email', [Admin\UserController::class, 'verifyEmail'])->name('users.verify-email');
    Route::post('/users/{id}/reset-password', [Admin\UserController::class, 'resetPassword'])->name('users.reset-password');
    Route::delete('/users/{id}', [Admin\UserController::class, 'destroy'])->name('users.destroy');
    Route::post('/users/bulk-action', [Admin\UserController::class, 'bulkAction'])->name('users.bulk-action');
});

require __DIR__.'/settings.php';