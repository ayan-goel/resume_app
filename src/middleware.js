import { NextResponse } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request) {
  // Get the pathname of the request
  const { pathname } = request.nextUrl;
  
  // Get the token from cookies
  const token = request.cookies.get('token')?.value;
  
  // Define paths that require authentication
  const authRequiredPaths = [
    '/admin',
    '/profile',
  ];
  
  // Check if the path requires authentication
  const requiresAuth = authRequiredPaths.some(path => 
    pathname.startsWith(path)
  );
  
  // If the path requires auth and there's no token, redirect to login
  if (requiresAuth && !token) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }
  
  // If the path is login and the user is already logged in, redirect to home
  if (pathname.startsWith('/auth/login') && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
    '/auth/login',
  ],
}; 