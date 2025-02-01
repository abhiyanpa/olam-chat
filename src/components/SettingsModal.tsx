import React, { useState } from 'react';
import { X, User, Mail, Camera, Loader2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AlertModal } from './AlertModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user }) => {
  const [username, setUsername] = useState(user?.user_metadata?.username || '');
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { username: username.trim() }
      });

      if (error) throw error;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user.id);

      if (profileError) throw profileError;

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
    await supabase.auth.signOut();
    onClose();
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
              <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold">
                {username[0]?.toUpperCase()}
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <Camera className="h-5 w-5" />
                <span>Change</span>
              </button>
            </div>
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
          className="w-full mt-4 py-3 px-4 rounded-lg shadow-lg text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors flex items-center justify-center space-x-2"
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