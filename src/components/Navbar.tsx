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
            <MessageSquare className="h-8 w-8 text-primary-400" />
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