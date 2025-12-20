import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Menu, X, LogOut } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { useAuth } from '../lib/AuthContext';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType, setAuthType] = useState<'login' | 'register'>('login');
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAuthClick = (type: 'login' | 'register') => {
    setAuthType(type);
    setShowAuthModal(true);
  };

  const handleLogout = async () => {
    if (user) {
      // Update online status before logout
      await setDoc(doc(db, 'profiles', user.uid), {
        online: false,
        last_seen: new Date().toISOString()
      }, { merge: true });
    }
    await signOut(auth);
    navigate('/', { replace: true });
  };

  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <svg className="h-10 w-10" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" style={{stopColor: '#FCAF45', stopOpacity: 1}} />
                  <stop offset="25%" style={{stopColor: '#FD1D1D', stopOpacity: 1}} />
                  <stop offset="50%" style={{stopColor: '#E1306C', stopOpacity: 1}} />
                  <stop offset="75%" style={{stopColor: '#C13584', stopOpacity: 1}} />
                  <stop offset="100%" style={{stopColor: '#833AB4', stopOpacity: 1}} />
                </linearGradient>
              </defs>
              <rect x="20" y="20" width="160" height="160" rx="45" fill="url(#logo-grad)"/>
              <g transform="translate(100, 100)">
                <rect x="-40" y="-35" width="80" height="60" rx="15" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="8"/>
                <path d="M -15 25 L -15 40 L -30 25" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="8" 
                  strokeLinejoin="round" 
                  strokeLinecap="round"/>
                <circle cx="-20" cy="-5" r="5" fill="white"/>
                <circle cx="0" cy="-5" r="5" fill="white"/>
                <circle cx="20" cy="-5" r="5" fill="white"/>
              </g>
            </svg>
            <span className="text-xl font-bold">Olam Chat</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-300">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 rounded-md hover:bg-gray-800 transition"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleAuthClick('login')}
                  className="px-4 py-2 rounded-md hover:bg-gray-800 transition"
                >
                  Login
                </button>
                <button
                  onClick={() => handleAuthClick('register')}
                  className="px-4 py-2 rounded-md bg-primary-600 hover:bg-primary-700 transition"
                >
                  Register
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-800"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {user ? (
                <>
                  <span className="block px-3 py-2 text-gray-300">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full px-3 py-2 rounded-md text-left hover:bg-gray-800"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleAuthClick('login')}
                    className="block w-full px-3 py-2 rounded-md text-center hover:bg-gray-800"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => handleAuthClick('register')}
                    className="block w-full px-3 py-2 rounded-md text-center bg-primary-600 hover:bg-primary-700"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        type={authType}
      />
    </nav>
  );
};