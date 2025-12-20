import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { AlertModal } from './AlertModal';
import { useNavigate } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, type }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if profile exists
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      
      if (!profileDoc.exists()) {
        // New user - create profile
        const baseUsername = user.displayName?.replace(/\s+/g, '').toLowerCase() || user.email?.split('@')[0] || 'user';
        let finalUsername = baseUsername;
        let counter = 1;
        
        // Find available username
        while (true) {
          const usernameDoc = await getDoc(doc(db, 'usernames', finalUsername));
          if (!usernameDoc.exists()) break;
          finalUsername = `${baseUsername}${counter}`;
          counter++;
        }

        // Create profile
        await setDoc(doc(db, 'profiles', user.uid), {
          username: finalUsername,
          email: user.email,
          avatar_url: user.photoURL,
          online: true,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Reserve username
        await setDoc(doc(db, 'usernames', finalUsername), {
          uid: user.uid
        });
      } else {
        // Existing user - update online status
        await setDoc(doc(db, 'profiles', user.uid), {
          online: true,
          last_seen: new Date().toISOString()
        }, { merge: true });
      }

      setAlertType('success');
      setAlertMessage('Login successful!');
      setShowAlert(true);
      onClose();
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      setAlertType('error');
      setAlertMessage(error.message);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (type === 'register') {
        if (!username.trim()) {
          throw new Error('Username is required');
        }

        // Check if username is already taken
        const usernameDoc = await getDoc(doc(db, 'usernames', username.trim().toLowerCase()));
        if (usernameDoc.exists()) {
          throw new Error('Username is already taken');
        }

        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile with username
        await updateProfile(user, {
          displayName: username.trim()
        });

        // Create user profile in Firestore
        await setDoc(doc(db, 'profiles', user.uid), {
          username: username.trim(),
          email: user.email,
          online: true,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Reserve username
        await setDoc(doc(db, 'usernames', username.trim().toLowerCase()), {
          uid: user.uid
        });

        setAlertType('success');
        setAlertMessage('Registration successful! You can now log in.');
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
          // Update online status
          await setDoc(doc(db, 'profiles', userCredential.user.uid), {
            online: true,
            last_seen: new Date().toISOString()
          }, { merge: true });

          setAlertType('success');
          setAlertMessage('Login successful!');
          onClose();
          navigate('/dashboard', { replace: true });
        }
      }
      setShowAlert(true);
      if (type === 'register') {
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      setAlertType('error');
      setAlertMessage(error.message);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-md p-8 relative transform transition-all duration-300 ease-in-out">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          {type === 'login' ? 'Welcome Back!' : 'Join Olam Chat'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {type === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 w-full rounded-lg bg-gray-800 border-2 border-gray-700 text-white focus:border-primary-500 focus:ring-primary-500 transition-colors"
                placeholder="Username"
                required
                minLength={3}
                maxLength={20}
                pattern="^[a-zA-Z0-9_-]+$"
                title="Username can only contain letters, numbers, underscores, and hyphens"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 w-full rounded-lg bg-gray-800 border-2 border-gray-700 text-white focus:border-primary-500 focus:ring-primary-500 transition-colors"
              placeholder="Email address"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 w-full rounded-lg bg-gray-800 border-2 border-gray-700 text-white focus:border-primary-500 focus:ring-primary-500 transition-colors"
              placeholder="Password"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg shadow-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading && <Loader2 className="animate-spin h-5 w-5" />}
            <span>{type === 'login' ? 'Sign In' : 'Sign Up'}</span>
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
            className="mt-4 w-full py-3 px-4 rounded-lg shadow-lg text-white bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Google</span>
          </button>
        </div>
      </div>

      <AlertModal
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        message={alertMessage}
        type={alertType}
      />
    </div>
  );
};