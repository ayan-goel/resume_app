"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

export default function AdminWrapper({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // If still loading, show a spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // If not authenticated or not an admin, redirect to admin login
  if (!isAuthenticated || user?.role !== "admin") {
    router.push("/auth/login");
    return null;
  }

  // User is authenticated and is an admin
  return <>{children}</>;
} 