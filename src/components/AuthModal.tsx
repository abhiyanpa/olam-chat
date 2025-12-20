import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
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