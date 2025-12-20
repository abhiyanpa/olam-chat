import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../lib/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { validateUsername, validateEmail } from '../lib/security';

type FormType = 'login' | 'register' | 'reset';

export const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formType, setFormType] = useState<FormType>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  
  // Reset field
  const [resetEmail, setResetEmail] = useState('');

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    const usernameDoc = await getDoc(doc(db, 'usernames', username));
    return !usernameDoc.exists();
  };

  const createUserProfile = async (uid: string, email: string, displayName: string, photoURL?: string) => {
    const baseUsername = displayName.replace(/\s+/g, '').toLowerCase() || email.split('@')[0] || 'user';
    let finalUsername = baseUsername;
    let counter = 1;

    while (!(await checkUsernameAvailability(finalUsername))) {
      finalUsername = `${baseUsername}${counter}`;
      counter++;
    }

    await setDoc(doc(db, 'profiles', uid), {
      username: finalUsername,
      email: email,
      avatar_url: photoURL || '',
      online: true,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await setDoc(doc(db, 'usernames', finalUsername), {
      uid: uid
    });
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      
      if (!profileDoc.exists()) {
        await createUserProfile(user.uid, user.email!, user.displayName || 'User', user.photoURL || undefined);
      } else {
        await setDoc(doc(db, 'profiles', user.uid), {
          online: true,
          last_seen: new Date().toISOString()
        }, { merge: true });
      }

      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'profiles', result.user.uid), {
        online: true,
        last_seen: new Date().toISOString()
      }, { merge: true });
      
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      setError(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match!');
      setLoading(false);
      return;
    }

    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    // Validate username format
    const usernameValidation = validateUsername(regUsername);
    if (!usernameValidation.valid) {
      setError(usernameValidation.error || 'Invalid username');
      setLoading(false);
      return;
    }

    // Validate email format
    const emailValidation = validateEmail(regEmail);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Invalid email');
      setLoading(false);
      return;
    }

    try {
      // Check if username is available
      const isAvailable = await checkUsernameAvailability(regUsername.toLowerCase());
      if (!isAvailable) {
        setError('Username is already taken');
        setLoading(false);
        return;
      }

      const result = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      await updateProfile(result.user, { displayName: regUsername });
      
      // Create profile with the chosen username
      await setDoc(doc(db, 'profiles', result.user.uid), {
        username: regUsername.toLowerCase(),
        email: regEmail,
        avatar_url: '',
        online: true,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Reserve username
      await setDoc(doc(db, 'usernames', regUsername.toLowerCase()), {
        uid: result.user.uid
      });
      
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setError('');
      alert('Password reset link sent! Check your email.');
      setFormType('login');
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign in to Olam Chat</title>
        <meta name="description" content="Sign in to Olam Chat - Connect with people around the world" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-5" style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
      }}>
        <div className="bg-[#2a2a3e] rounded-[20px] p-10 w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-fadeIn">
          {/* Logo */}
          <div className="text-center mb-8">
            <svg className="w-[100px] h-[100px] mx-auto mb-5" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="insta-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" style={{stopColor: '#FCAF45', stopOpacity: 1}} />
                  <stop offset="25%" style={{stopColor: '#FD1D1D', stopOpacity: 1}} />
                  <stop offset="50%" style={{stopColor: '#E1306C', stopOpacity: 1}} />
                  <stop offset="75%" style={{stopColor: '#C13584', stopOpacity: 1}} />
                  <stop offset="100%" style={{stopColor: '#833AB4', stopOpacity: 1}} />
                </linearGradient>
              </defs>
              <rect x="20" y="20" width="160" height="160" rx="45" fill="url(#insta-grad)"/>
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
          </div>

          {/* Login Form */}
          {formType === 'login' && (
            <div>
              <h1 className="text-white text-[28px] font-semibold text-center mb-2">Sign in to Olam Chat</h1>
              <p className="text-[#9ca3af] text-center text-sm mb-10 leading-relaxed">
                Connect with people around the world. Choose your preferred sign-in method.
              </p>

              {/* Error Message */}
              {error && (
                <div className="mb-5 p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Social Login */}
              <div className="flex flex-col gap-3 mb-8">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex items-center justify-center gap-3 p-3.5 border border-[#3a3a4e] bg-[#1f1f2e] text-white rounded-xl text-[15px] font-medium hover:bg-[#2a2a3e] hover:border-[#4a4a5e] transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
              </div>

              <div className="flex items-center my-8 text-[#6b7280] text-[13px]">
                <div className="flex-1 h-px bg-[#3a3a4e]" />
                <span className="px-4">or continue with email</span>
                <div className="flex-1 h-px bg-[#3a3a4e]" />
              </div>

              <form onSubmit={handleLogin}>
                <div className="mb-5">
                  <label className="block text-[#9ca3af] text-[13px] mb-2 font-medium">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={loading}
                    className="w-full p-3.5 bg-[#1f1f2e] border border-[#3a3a4e] rounded-xl text-white text-[15px] focus:outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20 transition-all disabled:opacity-50"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-[#9ca3af] text-[13px] mb-2 font-medium">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                    className="w-full p-3.5 bg-[#1f1f2e] border border-[#3a3a4e] rounded-xl text-white text-[15px] focus:outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20 transition-all disabled:opacity-50"
                  />
                </div>

                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={() => setFormType('reset')}
                    className="text-[#667eea] text-[13px] hover:text-[#8b9dff] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-3.5 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white text-base font-semibold rounded-xl mt-6 hover:shadow-lg hover:shadow-[#667eea]/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                </button>
              </form>

              <div className="text-center mt-6 text-[#9ca3af] text-sm">
                Don't have an account?{' '}
                <button
                  onClick={() => setFormType('register')}
                  className="text-[#667eea] font-semibold hover:text-[#8b9dff] transition-colors"
                >
                  Sign up
                </button>
              </div>
            </div>
          )}

          {/* Register Form */}
          {formType === 'register' && (
            <div>
              <h1 className="text-white text-[28px] font-semibold text-center mb-2">Create Account</h1>
              <p className="text-[#9ca3af] text-center text-sm mb-10 leading-relaxed">
                Join Olam Chat and start connecting with people worldwide.
              </p>

              {error && (
                <div className="mb-5 p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3 mb-8">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex items-center justify-center gap-3 p-3.5 border border-[#3a3a4e] bg-[#1f1f2e] text-white rounded-xl text-[15px] font-medium hover:bg-[#2a2a3e] hover:border-[#4a4a5e] transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign up with Google
                </button>
              </div>

              <div className="flex items-center my-8 text-[#6b7280] text-[13px]">
                <div className="flex-1 h-px bg-[#3a3a4e]" />
                <span className="px-4">or sign up with email</span>
                <div className="flex-1 h-px bg-[#3a3a4e]" />
              </div>

              <form onSubmit={handleRegister}>
                <div className="mb-5">
                  <label className="block text-[#9ca3af] text-[13px] mb-2 font-medium">Username</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="johndoe (letters, numbers, underscores)"
                    required
                    disabled={loading}
                    pattern="[a-zA-Z0-9_]{3,20}"
                    minLength={3}
                    maxLength={20}
                    className="w-full p-3.5 bg-[#1f1f2e] border border-[#3a3a4e] rounded-xl text-white text-[15px] focus:outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20 transition-all disabled:opacity-50"
                  />
                  <p className="text-[#6b7280] text-xs mt-1">3-20 characters, no spaces or special characters</p>
                </div>

                <div className="mb-5">
                  <label className="block text-[#9ca3af] text-[13px] mb-2 font-medium">Email</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={loading}
                    className="w-full p-3.5 bg-[#1f1f2e] border border-[#3a3a4e] rounded-xl text-white text-[15px] focus:outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20 transition-all disabled:opacity-50"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-[#9ca3af] text-[13px] mb-2 font-medium">Password</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    disabled={loading}
                    className="w-full p-3.5 bg-[#1f1f2e] border border-[#3a3a4e] rounded-xl text-white text-[15px] focus:outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20 transition-all disabled:opacity-50"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-[#9ca3af] text-[13px] mb-2 font-medium">Confirm Password</label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    minLength={8}
                    disabled={loading}
                    className="w-full p-3.5 bg-[#1f1f2e] border border-[#3a3a4e] rounded-xl text-white text-[15px] focus:outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20 transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-3.5 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white text-base font-semibold rounded-xl mt-6 hover:shadow-lg hover:shadow-[#667eea]/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                </button>
              </form>

              <div className="text-center mt-6 text-[#9ca3af] text-sm">
                Already have an account?{' '}
                <button
                  onClick={() => setFormType('login')}
                  className="text-[#667eea] font-semibold hover:text-[#8b9dff] transition-colors"
                >
                  Sign in
                </button>
              </div>
            </div>
          )}

          {/* Reset Password Form */}
          {formType === 'reset' && (
            <div>
              <h1 className="text-white text-[28px] font-semibold text-center mb-2">Reset Password</h1>
              <p className="text-[#9ca3af] text-center text-sm mb-10 leading-relaxed">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {error && (
                <div className="mb-5 p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword}>
                <div className="mb-5">
                  <label className="block text-[#9ca3af] text-[13px] mb-2 font-medium">Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={loading}
                    className="w-full p-3.5 bg-[#1f1f2e] border border-[#3a3a4e] rounded-xl text-white text-[15px] focus:outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20 transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-3.5 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white text-base font-semibold rounded-xl mt-6 hover:shadow-lg hover:shadow-[#667eea]/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>

              <div className="text-center mt-6 text-[#9ca3af] text-sm">
                Remember your password?{' '}
                <button
                  onClick={() => setFormType('login')}
                  className="text-[#667eea] font-semibold hover:text-[#8b9dff] transition-colors"
                >
                  Sign in
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};