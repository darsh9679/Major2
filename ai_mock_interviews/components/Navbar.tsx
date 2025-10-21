"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "@/lib/actions/auth.action";

interface NavbarProps {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

const Navbar = ({ user }: NavbarProps) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      router.push("/sign-in");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  return (
    <nav className="mb-8">
      <div className="flex justify-between items-center">
        {/* Logo and Brand */}
         <Link href="/" className="flex items-center gap-2">
           <Image src="/logo.svg" alt="MockMate AI Logo" width={38} height={32} />
           <h2 className="text-primary-100 font-bold text-xl">MockMate AI</h2>
         </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          <Link
            href="/"
            className="text-light-100 hover:text-primary-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Home
          </Link>
           <Link
             href="/interview"
             className="text-light-100 hover:text-primary-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
           >
             Generate Interview
           </Link>
          <a
            href="https://resume-five-psi-95.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-light-100 hover:text-primary-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            AI Resume Analyzer
          </a>
        </div>

        {/* Profile Section */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-200 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-dark-100 font-semibold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-light-100">{user.name}</p>
                <p className="text-xs text-light-400">{user.email}</p>
              </div>
              <svg
                className={`w-4 h-4 text-light-400 transition-transform ${
                  isProfileOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 dark-gradient rounded-lg shadow-lg border border-gray-600 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-600">
                  <p className="text-sm font-medium text-light-100">{user.name}</p>
                  <p className="text-sm text-light-400">{user.email}</p>
                </div>
                
                <div className="py-2">
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-destructive-100 hover:bg-destructive-100/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sign Out
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden mt-4">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            href="/"
            className="text-light-100 hover:text-primary-100 block px-3 py-2 rounded-md text-base font-medium"
          >
            Home
          </Link>
           <Link
             href="/interview"
             className="text-light-100 hover:text-primary-100 block px-3 py-2 rounded-md text-base font-medium"
           >
             Generate Interview
           </Link>
          <a
            href="https://resume-five-psi-95.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-light-100 hover:text-primary-100 block px-3 py-2 rounded-md text-base font-medium"
          >
            AI Resume Analyzer
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
