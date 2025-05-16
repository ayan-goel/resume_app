import { NextResponse } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request) {
  // Get the pathname of the request
  const { pathname } = request.nextUrl;
  
  // Get the token from cookies (for admin auth)
  const adminToken = request.cookies.get('token')?.value;
  
  // Check for Supabase auth token in the request headers (set by frontend)
  const hasSupabaseSession = request.headers.get('x-supabase-auth') === 'true';
  
  // Define paths that require admin authentication
  const adminRequiredPaths = [
    '/admin',
    '/profile',
  ];
  
  // Define paths that require member authentication (Supabase)
  const memberRequiredPaths = [
    '/search',
  ];
  
  // Check if the path requires admin authentication
  const requiresAdminAuth = adminRequiredPaths.some(path => 
    pathname.startsWith(path)
  );
  
  // Check if the path requires member authentication
  const requiresMemberAuth = memberRequiredPaths.some(path => 
    pathname.startsWith(path)
  );
  
  // Debugging
  console.log('Path:', pathname);
  console.log('Supabase Session:', hasSupabaseSession ? 'Present' : 'Missing');
  
  // If the path requires admin auth and there's no token, redirect to admin login
  if (requiresAdminAuth && !adminToken) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }
  
  // Don't check memberRequiredPaths for now - this will be handled client-side
  // We'll disable this server-side check until we figure out a reliable way to verify the session
  
  // If the path is admin login and the user is already logged in, redirect to home
  if (pathname.startsWith('/auth/login') && adminToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

// Configure which paths the middleware runs on - only protect admin routes for now
export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
    '/auth/login',
  ],
}; 