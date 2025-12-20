import React, { useState, useRef } from 'react';
import { X, User, Mail, Camera, Loader2, LogOut } from 'lucide-react';
import { auth, db, storage } from '../lib/firebase';
import { updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  const [uploading, setUploading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [avatarUrl, setAvatarUrl] = useState(user?.photoURL || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setAlertType('error');
      setAlertMessage('Image must be less than 5MB');
      setShowAlert(true);
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setAlertType('error');
      setAlertMessage('Only image files are allowed');
      setShowAlert(true);
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateProfile(auth.currentUser!, {
        photoURL: downloadURL
      });

      await setDoc(doc(db, 'profiles', user.uid), {
        avatar_url: downloadURL,
        updated_at: new Date().toISOString()
      }, { merge: true });

      setAvatarUrl(downloadURL);
      setAlertType('success');
      setAlertMessage('Profile picture updated!');
      setShowAlert(true);
    } catch (error: any) {
      setAlertType('error');
      setAlertMessage(error.message);
      setShowAlert(true);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!auth.currentUser) throw new Error('No user logged in');

      await updateProfile(auth.currentUser, {
        displayName: username.trim()
      });

      await setDoc(doc(db, 'profiles', user.uid), {
        username: username.trim(),
        updated_at: new Date().toISOString()
      }, { merge: true });

      setAlertType('success');
      setAlertMessage('Profile updated successfully!');
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-md p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Profile Picture
            </label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold">
                    {username[0]?.toUpperCase()}
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-white" size={24} />
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="h-5 w-5" />
                <span>{uploading ? 'Uploading...' : 'Change'}</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Max size: 5MB. Formats: JPG, PNG, GIF</p>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 w-full rounded-lg bg-gray-800 border-2 border-gray-700 text-white focus:border-primary-500 focus:ring-primary-500 transition-colors"
                required
                minLength={3}
                maxLength={20}
                pattern="^[a-zA-Z0-9_-]+$"
                title="Username can only contain letters, numbers, underscores, and hyphens"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="email"
                value={user.email}
                disabled
                className="pl-10 w-full rounded-lg bg-gray-800 border-2 border-gray-700 text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg shadow-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading && <Loader2 className="animate-spin h-5 w-5" />}
            <span>Save Changes</span>
          </button>
        </form>

        <button
          onClick={handleLogout}
          className="w-full mt-4 py-3 px-4 rounded-lg shadow-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors flex items-center justify-center space-x-2"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
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