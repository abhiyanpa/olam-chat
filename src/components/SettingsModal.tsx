import React, { useState, useEffect } from 'react';
import { X, User, Mail, Loader2, LogOut, Check, Bell, Moon, Shield, Globe } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { AlertModal } from './AlertModal';
import { useNavigate } from 'react-router-dom';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!auth.currentUser) throw new Error('No user logged in');

      // If username changed, check if new username is available
      if (username.trim().toLowerCase() !== user.displayName?.toLowerCase()) {
        const usernameDoc = await getDoc(doc(db, 'usernames', username.trim().toLowerCase()));
        if (usernameDoc.exists() && usernameDoc.data().uid !== user.uid) {
          throw new Error('Username is already taken');
        }

        // Remove old username reservation
        if (user.displayName) {
          await deleteDoc(doc(db, 'usernames', user.displayName.toLowerCase()));
        }

        // Reserve new username
        await setDoc(doc(db, 'usernames', username.trim().toLowerCase()), {
          uid: user.uid
        });
      }

      await updateProfile(auth.currentUser, {
        displayName: username.trim()
      });

      await setDoc(doc(db, 'profiles', user.uid), {
        username: username.trim(),
        updated_at: new Date().toISOString()
      }, { merge: true });

      setAlertType('success');
      setAlertMessage('Profile updated successfully');
      setShowAlert(true);
    } catch (error: any) {
      setAlertType('error');
      setAlertMessage(error.message);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Update online status before logout
      await setDoc(doc(db, 'profiles', user.uid), {
        online: false,
        last_seen: new Date().toISOString()
      }, { merge: true });

      await signOut(auth);
      
      onClose();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
      setAlertType('error');
      setAlertMessage('Failed to logout. Please try again.');
      setShowAlert(true);
    }
  };

  if (!isOpen) return null;

  const getProviderName = () => {
    return user?.providerData?.[0]?.providerId?.includes('google') ? 'Google' : 
           user?.providerData?.[0]?.providerId?.includes('apple') ? 'Apple' : 'Provider';
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-[#0e1621] rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">\n            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2332]">
              <div>
                <h2 className="text-lg font-semibold text-white">Settings</h2>
                <p className="text-sm text-gray-400 mt-0.5">Manage your account and preferences</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#1a2332] rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto overscroll-contain flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
              
              {/* Profile Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">Profile</h3>
                
                <div className="flex items-start gap-4 p-4 bg-[#1a2332] rounded-lg border border-[#2a3544]">
                  <div className="relative flex-shrink-0">
                    {user?.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="Profile" 
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#8B7FFF] flex items-center justify-center text-xl font-semibold text-white">
                        {username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{username || 'User'}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-400">Connected via {getProviderName()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">Account Information</h3>
                
                <div className="space-y-4">
                  {/* Username */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1a2332] border border-[#2a3544] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7FFF] focus:border-transparent transition-shadow"
                      required
                      minLength={3}
                      maxLength={20}
                      pattern="^[a-zA-Z0-9_-]+$"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      Only letters, numbers, underscores and hyphens. {username.length}/20
                    </p>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3 py-2 bg-[#0e1621] border border-[#2a3544] rounded-lg text-sm text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      Email cannot be changed
                    </p>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">Preferences</h3>
                
                <div className="space-y-3">
                  {/* Push Notifications */}
                  <div className="flex items-center justify-between py-3 border-b border-[#1a2332]">
                    <div className="flex items-start gap-3">
                      <Bell className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Push Notifications</p>
                        <p className="text-xs text-gray-500 mt-0.5">Get notified about new messages</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#8B7FFF] focus:ring-offset-2 focus:ring-offset-[#0e1621] ${
                        notificationsEnabled ? 'bg-[#8B7FFF]' : 'bg-[#2a3544]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Email Notifications */}
                  <div className="flex items-center justify-between py-3 border-b border-[#1a2332]">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Email Notifications</p>
                        <p className="text-xs text-gray-500 mt-0.5">Receive updates via email</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailNotifications(!emailNotifications)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#8B7FFF] focus:ring-offset-2 focus:ring-offset-[#0e1621] ${
                        emailNotifications ? 'bg-[#8B7FFF]' : 'bg-[#2a3544]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          emailNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Dark Mode */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-start gap-3">
                      <Moon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Dark Mode</p>
                        <p className="text-xs text-gray-500 mt-0.5">Use dark theme (coming soon)</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-[#2a3544] opacity-50"
                    >
                      <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="space-y-4 pt-4 border-t border-[#1a2332]">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-400" />
                  <h3 className="text-sm font-medium text-red-400">Danger Zone</h3>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#0e1621] border-t border-[#1a2332] rounded-b-lg">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-[#1a2332] border border-[#2a3544] rounded-lg hover:bg-[#252f3f] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#8B7FFF] rounded-lg hover:bg-[#7B6FEF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        message={alertMessage}
        type={alertType}
      />
    </>
  );
};