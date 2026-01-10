import React, { useEffect, useState } from 'react';
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
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Loader2, ArrowLeft } from 'lucide-react';
import { validateUsername, validateEmail } from '../lib/security';

type FormType = 'login' | 'register' | 'reset';

export const Home = () => {
  const { user, loading: authLoading } = useAuth();
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

  // Redirect authenticated users back to the dashboard
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Render-level guard to prevent showing auth page when already signed in
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
        <title>{formType === 'login' ? 'Sign in to Olam Chat' : formType === 'register' ? 'Sign up for Olam Chat' : 'Reset Password'}</title>
        <meta name="description" content="Sign in to Olam Chat - Connect with people around the world" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-6" style={{
        background: '#0e1621'
      }}>
        <div className="w-full max-w-[360px] animate-fadeIn">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #8B7FFF 0%, #6B5FD8 100%)'
            }}>
              <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 35 L45 25 L80 35 L80 55 L50 75 L20 55 Z" fill="white" opacity="0.9"/>
                <path d="M50 25 L50 75" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M35 40 L65 40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M30 52 L70 52" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          {/* Login Form */}
          {formType === 'login' && (
            <div>
              <h1 className="text-white text-[32px] font-light text-center mb-3">Sign in to Olam Chat</h1>
              <p className="text-[#6b7694] text-center text-[15px] mb-12 leading-relaxed">
                Please enter your email address<br />to sign in to your account.
              </p>

              {/* Error Message */}
              {error && (
                <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-[#6b7694] text-[13px] mb-2.5 font-normal">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={loading}
                    className="w-full p-4 bg-[#1a2332] border border-[#2a3544] rounded-lg text-white text-[15px] placeholder-[#4a5568] focus:outline-none focus:border-[#8B7FFF] transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[#6b7694] text-[13px] mb-2.5 font-normal">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                    className="w-full p-4 bg-[#1a2332] border border-[#2a3544] rounded-lg text-white text-[15px] placeholder-[#4a5568] focus:outline-none focus:border-[#8B7FFF] transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-4 bg-[#8B7FFF] hover:bg-[#7B6FEF] text-white text-[15px] font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-8"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'NEXT'}
                </button>
              </form>

              <div className="mt-8 space-y-4">
                <button
                  onClick={() => setFormType('reset')}
                  className="block w-full text-center text-[#8B7FFF] text-[14px] hover:text-[#9B8FFF] transition-colors"
                >
                  Forgot your password?
                </button>

                {/* Social Login */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 p-4 border border-[#2a3544] bg-[#1a2332] hover:bg-[#1f2937] text-white rounded-lg text-[15px] font-medium transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>

              <div className="text-center mt-10 pt-6 border-t border-[#1f2937]">
                <span className="text-[#6b7694] text-[14px]">Don't have an account? </span>
                <button
                  onClick={() => setFormType('register')}
                  className="text-[#8B7FFF] text-[14px] font-medium hover:text-[#9B8FFF] transition-colors"
                >
                  Sign up
                </button>
              </div>
            </div>
          )}

          {/* Register Form */}
          {formType === 'register' && (
            <div>
              <button
                onClick={() => setFormType('login')}
                className="flex items-center gap-2 text-[#8B7FFF] mb-4 hover:text-[#9B8FFF] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-[13px]">Back to Sign In</span>
              </button>

              <h1 className="text-white text-[26px] font-light text-center mb-2">Sign up for Olam Chat</h1>
              <p className="text-[#6b7694] text-center text-[13px] mb-6 leading-relaxed">
                Create your account to start connecting with others.
              </p>

              {error && (
                <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-[#6b7694] text-[12px] mb-1.5 font-normal">Username</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Choose a username"
                    required
                    disabled={loading}
                    pattern="[a-zA-Z0-9_]{3,20}"
                    minLength={3}
                    maxLength={20}
                    className="w-full p-3 bg-[#1a2332] border border-[#2a3544] rounded-lg text-white text-[14px] placeholder-[#4a5568] focus:outline-none focus:border-[#8B7FFF] transition-all disabled:opacity-50"
                  />
                  <p className="text-[#4a5568] text-[10px] mt-1">3-20 characters, letters, numbers and underscores</p>
                </div>

                <div>
                  <label className="block text-[#6b7694] text-[12px] mb-1.5 font-normal">Email</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={loading}
                    className="w-full p-3 bg-[#1a2332] border border-[#2a3544] rounded-lg text-white text-[14px] placeholder-[#4a5568] focus:outline-none focus:border-[#8B7FFF] transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[#6b7694] text-[12px] mb-1.5 font-normal">Password</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    disabled={loading}
                    className="w-full p-3 bg-[#1a2332] border border-[#2a3544] rounded-lg text-white text-[14px] placeholder-[#4a5568] focus:outline-none focus:border-[#8B7FFF] transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[#6b7694] text-[12px] mb-1.5 font-normal">Confirm Password</label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    minLength={8}
                    disabled={loading}
                    className="w-full p-3 bg-[#1a2332] border border-[#2a3544] rounded-lg text-white text-[14px] placeholder-[#4a5568] focus:outline-none focus:border-[#8B7FFF] transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-3 bg-[#8B7FFF] hover:bg-[#7B6FEF] text-white text-[14px] font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CREATE ACCOUNT'}
                </button>
              </form>

              {/* Social Login */}
              <div className="mt-4">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 p-3 border border-[#2a3544] bg-[#1a2332] hover:bg-[#1f2937] text-white rounded-lg text-[14px] font-medium transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign up with Google
                </button>
              </div>
            </div>
          )}

          {/* Reset Password Form */}
          {formType === 'reset' && (
            <div>
              <button
                onClick={() => setFormType('login')}
                className="flex items-center gap-2 text-[#8B7FFF] mb-8 hover:text-[#9B8FFF] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-[14px]">Back to Sign In</span>
              </button>

              <h1 className="text-white text-[32px] font-light text-center mb-3">Reset Password</h1>
              <p className="text-[#6b7694] text-center text-[15px] mb-12 leading-relaxed">
                Enter your email address and we'll<br />send you a link to reset your password.
              </p>

              {error && (
                <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-[#6b7694] text-[13px] mb-2.5 font-normal">Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={loading}
                    className="w-full p-4 bg-[#1a2332] border border-[#2a3544] rounded-lg text-white text-[15px] placeholder-[#4a5568] focus:outline-none focus:border-[#8B7FFF] transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-4 bg-[#8B7FFF] hover:bg-[#7B6FEF] text-white text-[15px] font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-8"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SEND RESET LINK'}
                </button>
              </form>

              <div className="text-center mt-10 pt-6 border-t border-[#1f2937]">
                <span className="text-[#6b7694] text-[14px]">Remember your password? </span>
                <button
                  onClick={() => setFormType('login')}
                  className="text-[#8B7FFF] text-[14px] font-medium hover:text-[#9B8FFF] transition-colors"
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