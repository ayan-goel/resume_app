"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import LogoutButton from "./LogoutButton";

export default function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Function to check if a path is active
  const isActive = (path) => {
    return pathname === path ? "bg-indigo-700" : "";
  };

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  return (
    <header className="bg-indigo-600">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="w-full py-6 flex items-center justify-between border-b border-indigo-500 lg:border-none">
          <div className="flex items-center">
            <Link href="/">
              <span className="text-white text-xl font-bold">Business Fraternity Resume Database</span>
            </Link>
            <div className="hidden ml-10 space-x-8 lg:block">
              <Link 
                href="/search" 
                className={`text-base font-medium text-white hover:text-indigo-50 px-3 py-2 rounded-md ${isActive('/search')}`}
              >
                Search
              </Link>
              
              {isAdmin && (
                <Link 
                  href="/admin/upload" 
                  className={`text-base font-medium text-white hover:text-indigo-50 px-3 py-2 rounded-md ${isActive('/admin/upload')}`}
                >
                  Upload
                </Link>
              )}
            </div>
          </div>
          <div className="ml-10 space-x-4">
            {isLoading ? (
              <div className="h-10 w-24 animate-pulse rounded-md bg-indigo-700"></div>
            ) : isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-white">
                  {user.firstName} {user.lastName}
                </span>
                <LogoutButton />
              </div>
            ) : (
              <Link 
                href="/auth/login" 
                className="inline-block bg-white py-2 px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50"
              >
                Login
              </Link>
            )}
          </div>
        </div>
        <div className="py-4 flex flex-wrap justify-center space-x-6 lg:hidden">
          <Link 
            href="/search" 
            className={`text-base font-medium text-white hover:text-indigo-50 px-3 py-2 rounded-md ${isActive('/search')}`}
          >
            Search
          </Link>
          
          {isAdmin && (
            <Link 
              href="/admin/upload" 
              className={`text-base font-medium text-white hover:text-indigo-50 px-3 py-2 rounded-md ${isActive('/admin/upload')}`}
            >
              Upload
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
} 