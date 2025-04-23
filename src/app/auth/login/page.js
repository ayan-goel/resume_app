"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { login } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      const userData = await login(email, password);
      
      // Redirect to admin upload page if user is admin, otherwise to home
      if (userData.role === 'admin') {
        router.push("/admin/upload");
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message || 
        "Login failed. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12 bg-[#f5f5f7]">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-[#1d1d1f]">Administrator Sign In</h1>
          <p className="mt-2 text-sm text-[#6e6e73]">
            Access the GT Alpha Kappa Psi resume management system
          </p>
        </div>
        
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-500 border border-red-100">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1d1d1f] mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full appearance-none rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
                placeholder="admin@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1d1d1f] mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full appearance-none rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-apple w-full py-2.5"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
            
            <Link href="/" className="flex justify-center text-sm text-[#0071e3] hover:text-[#0077ed] transition-colors">
              Return to home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 