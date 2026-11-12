<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if user is authenticated
        if (! $request->user()) {
            return redirect()->route('login');
        }

        // Check if user is admin
        if (! $request->user()->isAdmin()) {
            abort(403, 'Unauthorized access. Admin privileges required.');
        }

        return $next($request);
    }
}
