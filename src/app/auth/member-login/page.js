"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";

export default function MemberLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResendOption, setShowResendOption] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, resendConfirmation, isAuthenticated } = useSupabaseAuth();
  
  // Check if there's a redirect destination
  const from = searchParams.get('from') || '/';
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Already authenticated, redirecting to:', from);
      router.push(from);
    }
  }, [isAuthenticated, router, from]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setShowResendOption(false);
    setResendMessage("");
    setIsLoading(true);
    
    try {
      await signIn(email, password);
      console.log('Signed in successfully, redirecting to:', from);
      
      // Navigate to the original destination or home
      router.push(from);
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage = err.message || "Login failed. Please check your credentials.";
      setError(errorMessage);
      
      // If it's an email confirmation error, show the resend option
      if (errorMessage.includes("confirm your account")) {
        setShowResendOption(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setResendLoading(true);
    setResendMessage("");
    
    try {
      await resendConfirmation(email);
      setResendMessage("Confirmation email sent! Please check your inbox.");
    } catch (err) {
      console.error("Error resending confirmation:", err);
      setError(err.message || "Failed to resend confirmation email. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12 bg-[#f5f5f7]">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-[#1d1d1f]">Member Sign In</h1>
          <p className="mt-2 text-sm text-[#6e6e73]">
            Access the GT Alpha Kappa Psi resume database
          </p>
        </div>
        
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-500 border border-red-100">
            {error}
            {showResendOption && (
              <button 
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                className="block mt-2 text-blue-500 hover:text-blue-700 font-medium"
              >
                {resendLoading ? "Sending..." : "Resend confirmation email"}
              </button>
            )}
          </div>
        )}
        
        {resendMessage && (
          <div className="rounded-xl bg-green-50 p-4 text-sm text-green-600 border border-green-100">
            {resendMessage}
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
                placeholder="your@email.com"
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
          </div>
        </form>
      </div>
    </div>
  );
} 