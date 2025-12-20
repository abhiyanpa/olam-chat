import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy, limit, getDoc } from 'firebase/firestore';
import { Users, MessageSquare, Shield, Activity, Search, Ban, CheckCircle, Clock, UserCheck } from 'lucide-react';

interface User {
  uid: string;
  username: string;
  email: string;
  role?: string;
  banned?: boolean;
  online?: boolean;
  last_seen?: string;
  created_at?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp: any;
  sender_username?: string;
  receiver_username?: string;
}

interface Stats {
  totalUsers: number;
  bannedUsers: number;
  totalMessages: number;
  onlineUsers: number;
}

export const Admin: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, bannedUsers: 0, totalMessages: 0, onlineUsers: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'messages' | 'stats'>('users');

  useEffect(() => {
    // Wait for auth to finish loading before checking admin access
    if (authLoading) return;
    checkAdminAccess();
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    try {
      console.log('Checking admin access for user:', user.uid);
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      console.log('Profile doc exists:', profileDoc.exists());
      
      if (!profileDoc.exists()) {
        console.error('Profile not found');
        alert('Profile not found. Please contact support.');
        navigate('/dashboard');
        return;
      }
      
      const profile = profileDoc.data();
      console.log('Profile data:', profile);
      console.log('User role:', profile?.role);
      
      if (profile?.role !== 'admin') {
        alert('Access denied: Admin privileges required. Your role: ' + (profile?.role || 'none'));
        navigate('/dashboard');
        return;
      }

      console.log('Admin access granted');
      setIsAdmin(true);
      await loadData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      alert('Error checking admin access: ' + (error as Error).message);
      navigate('/dashboard');
    } finally {
      setPageLoading(false);
    }
  };

  const loadData = async () => {
    try {
      // Load users
      const usersSnapshot = await getDocs(collection(db, 'profiles'));
      const usersData = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as User));
      setUsers(usersData);

      // Load recent messages
      const messagesQuery = query(
        collection(db, 'private_messages'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const messagesData = await Promise.all(
        messagesSnapshot.docs.map(async (msgDoc) => {
          const msgData = msgDoc.data();
          const senderProfile = usersData.find(u => u.uid === msgData.sender_id);
          const receiverProfile = usersData.find(u => u.uid === msgData.receiver_id);
          
          return {
            id: msgDoc.id,
            ...msgData,
            sender_username: senderProfile?.username || 'Unknown',
            receiver_username: receiverProfile?.username || 'Unknown'
          } as Message;
        })
      );
      setMessages(messagesData);

      // Calculate stats
      const bannedCount = usersData.filter(u => u.banned).length;
      const onlineCount = usersData.filter(u => u.online).length;
      setStats({
        totalUsers: usersData.length,
        bannedUsers: bannedCount,
        totalMessages: messagesSnapshot.size,
        onlineUsers: onlineCount
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const handleBanUser = async (userId: string, currentBannedStatus: boolean) => {
    const action = currentBannedStatus ? 'unban' : 'ban';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      await updateDoc(doc(db, 'profiles', userId), {
        banned: !currentBannedStatus,
        updated_at: new Date().toISOString()
      });

      setUsers(users.map(u => 
        u.uid === userId ? { ...u, banned: !currentBannedStatus } : u
      ));

      alert(`User ${action}ned successfully`);
    } catch (error: any) {
      console.error('Error updating user ban status:', error);
      alert(`Failed to ${action} user: ${error.message}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <p className="text-gray-400 text-sm">Manage users and monitor activity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Online Now</p>
                <p className="text-3xl font-bold mt-1">{stats.onlineUsers}</p>
              </div>
              <Activity className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Messages</p>
                <p className="text-3xl font-bold mt-1">{stats.totalMessages}</p>
              </div>
              <MessageSquare className="h-10 w-10 text-purple-500" />
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Banned Users</p>
                <p className="text-3xl font-bold mt-1">{stats.bannedUsers}</p>
              </div>
              <Ban className="h-10 w-10 text-red-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'messages'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Messages
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'stats'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Statistics
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-gray-900 rounded-lg border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by username or email..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                            {u.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{u.username}</div>
                            <div className="text-xs text-gray-400">
                              {u.online ? (
                                <span className="flex items-center gap-1">
                                  <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                                  Online
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {u.last_seen ? new Date(u.last_seen).toLocaleDateString() : 'Never'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-300'
                        }`}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.banned ? (
                          <span className="flex items-center gap-1 text-red-400 text-sm">
                            <Ban className="h-4 w-4" />
                            Banned
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-400 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleBanUser(u.uid, u.banned || false)}
                            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                              u.banned
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                          >
                            {u.banned ? 'Unban' : 'Ban'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="bg-gray-900 rounded-lg border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold">Recent Messages (Last 50)</h2>
              <p className="text-sm text-gray-400">View recent chat activity</p>
            </div>
            <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-blue-400">{msg.sender_username}</span>
                        <span className="text-gray-500">→</span>
                        <span className="font-medium text-purple-400">{msg.receiver_username}</span>
                        <span className="text-gray-500 text-sm">
                          {msg.timestamp?.toDate?.()
                            ? new Date(msg.timestamp.toDate()).toLocaleString()
                            : 'Unknown time'}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm break-words">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4">User Statistics</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Registered Users</span>
                  <span className="text-2xl font-bold">{stats.totalUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Active Users (Not Banned)</span>
                  <span className="text-2xl font-bold text-green-400">{stats.totalUsers - stats.bannedUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Banned Users</span>
                  <span className="text-2xl font-bold text-red-400">{stats.bannedUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Currently Online</span>
                  <span className="text-2xl font-bold text-blue-400">{stats.onlineUsers}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4">Message Statistics</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Messages (Recent)</span>
                  <span className="text-2xl font-bold">{stats.totalMessages}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
