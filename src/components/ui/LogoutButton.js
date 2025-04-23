'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const { logout, isAuthenticated } = useAuth();
  const router = useRouter();
  
  if (!isAuthenticated) return null;
  
  const handleLogout = () => {
    logout();
    router.push('/');
  };
  
  return (
    <button
      onClick={handleLogout}
      className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
    >
      Logout
    </button>
  );
} 