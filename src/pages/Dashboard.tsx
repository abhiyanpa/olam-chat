import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';
import { Search, Phone, Mail, FileText, Send, Paperclip, Loader2, Settings, Menu } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs, Timestamp, writeBatch, doc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { SettingsModal } from '../components/SettingsModal';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  online: boolean;
  last_seen: any;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: any;
  read?: boolean;
  status?: 'sending' | 'sent' | 'delivered';
}

interface Conversation {
  userId: string;
  username: string;
  avatarUrl?: string;
  lastMessage: string;
  lastMessageTime: any;
  unreadCount: number;
  online: boolean;
}

const getColorForUser = (userId: string): string => {
  const colors = [
    '#667eea', '#f093fb', '#4facfe', '#fa709a', '#a8edea',
    '#ff9a9e', '#ffecd2', '#a1c4fd', '#e0c3fc', '#fbc2eb',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#AAB7B8'
  ];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getInitial = (username: string): string => {
  if (!username) return '?';
  return username.charAt(0).toUpperCase();
};

interface AvatarProps {
  avatarUrl?: string;
  username: string;
  userId: string;
  size?: number;
}

const Avatar: React.FC<AvatarProps> = ({ avatarUrl, username, userId, size = 40 }) => {
  if (avatarUrl) {
    return (
      <div
        className="rounded-full flex-shrink-0"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundImage: `url(${avatarUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
    );
  }

  const bgColor = getColorForUser(userId);
  const initial = getInitial(username);
  const fontSize = size * 0.45;

  return (
    <div
      className="rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: bgColor,
        fontSize: `${fontSize}px`
      }}
    >
      {initial}
    </div>
  );
};

export const Dashboard = () => {
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettings) {
        setShowSettings(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSettings]);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const formatListTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      
      if (minutes < 1) return 'now';
      if (minutes < 60) return `${minutes}m`;
      if (hours < 24) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const truncateMessage = (text: string, maxLength: number = 35) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const shouldGroupMessages = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return false;
    if (currentMsg.sender_id !== prevMsg.sender_id) return false;
    
    const timeDiff = (currentMsg.created_at?.toMillis?.() || 0) - (prevMsg.created_at?.toMillis?.() || 0);
    return timeDiff < 60000; // Group if within 1 minute
  };

  useEffect(() => {
    if (!user) return;

    const updateConversations = async () => {
      const messagesRef = collection(db, 'private_messages');
      
      const q1 = query(messagesRef, where('sender_id', '==', user.uid), orderBy('created_at', 'desc'));
      const q2 = query(messagesRef, where('receiver_id', '==', user.uid), orderBy('created_at', 'desc'));

      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      const conversationMap = new Map<string, Conversation>();

      const processSnapshot = (snapshot: any, isSender: boolean) => {
        snapshot.forEach((doc: any) => {
          const msg = doc.data();
          const otherUserId = isSender ? msg.receiver_id : msg.sender_id;

          const existing = conversationMap.get(otherUserId);
          if (!existing || (msg.created_at?.toMillis?.() || 0) > (existing.lastMessageTime?.toMillis?.() || 0)) {
            conversationMap.set(otherUserId, {
              userId: otherUserId,
              username: isSender ? msg.receiver_name : msg.sender_name,
              avatarUrl: '',
              lastMessage: msg.content,
              lastMessageTime: msg.created_at,
              unreadCount: 0,
              online: false,
            });
          }
        });
      };

      processSnapshot(snapshot1, true);
      processSnapshot(snapshot2, false);

      const profilesRef = collection(db, 'profiles');
      const profilesSnapshot = await getDocs(profilesRef);
      
      profilesSnapshot.forEach((doc) => {
        const profile = doc.data();
        const conversation = conversationMap.get(doc.id);
        if (conversation) {
          conversation.avatarUrl = profile.avatar_url || '';
          conversation.online = profile.online || false;
          conversation.username = profile.username || conversation.username;
        }
      });

      const unreadQuery = query(messagesRef, where('receiver_id', '==', user.uid), where('read', '==', false));
      const unreadSnapshot = await getDocs(unreadQuery);
      
      unreadSnapshot.forEach((doc) => {
        const msg = doc.data();
        const conversation = conversationMap.get(msg.sender_id);
        if (conversation) conversation.unreadCount++;
      });

      // Sort conversations by latest message time (newest first)
      const sortedConversations = Array.from(conversationMap.values()).sort((a, b) => {
        const timeA = a.lastMessageTime?.toMillis?.() || 0;
        const timeB = b.lastMessageTime?.toMillis?.() || 0;
        return timeB - timeA; // Descending order (newest first)
      });

      setConversations(sortedConversations);
    };

    updateConversations();

    const messagesRef = collection(db, 'private_messages');
    
    // Listen for both sent and received messages to update conversation list
    const q1 = query(messagesRef, where('receiver_id', '==', user.uid), orderBy('created_at', 'desc'));
    const q2 = query(messagesRef, where('sender_id', '==', user.uid), orderBy('created_at', 'desc'));
    
    const unsubscribe1 = onSnapshot(q1, () => {
      updateConversations();
    });
    
    const unsubscribe2 = onSnapshot(q2, () => {
      updateConversations();
    });

    // Listen for profile updates to sync avatars in real-time
    const profilesRef = collection(db, 'profiles');
    const unsubscribe3 = onSnapshot(profilesRef, () => {
      updateConversations();
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !selectedUser) {
      setMessages([]);
      return;
    }

    // Clear messages when switching conversations
    setMessages([]);

    const messagesRef = collection(db, 'private_messages');
    const q1 = query(messagesRef, where('sender_id', '==', user.uid), where('receiver_id', '==', selectedUser.id), orderBy('created_at', 'asc'));
    const q2 = query(messagesRef, where('sender_id', '==', selectedUser.id), where('receiver_id', '==', user.uid), orderBy('created_at', 'asc'));

    let sentMessages: Message[] = [];
    let receivedMessages: Message[] = [];

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      sentMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      const allMessages = [...sentMessages, ...receivedMessages];
      allMessages.sort((a, b) => (a.created_at?.toMillis?.() || 0) - (b.created_at?.toMillis?.() || 0));
      setMessages(allMessages);
    });

    const unsubscribe2 = onSnapshot(q2, async (snapshot) => {
      receivedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      const allMessages = [...sentMessages, ...receivedMessages];
      allMessages.sort((a, b) => (a.created_at?.toMillis?.() || 0) - (b.created_at?.toMillis?.() || 0));
      setMessages(allMessages);

      const unreadMessages = snapshot.docs.filter(doc => !doc.data().read).slice(0, 5);
      if (unreadMessages.length > 0) {
        const batch = writeBatch(db);
        unreadMessages.forEach(msgDoc => {
          batch.update(doc(db, 'private_messages', msgDoc.id), { read: true });
        });
        await batch.commit();
      }
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user, selectedUser]);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const profilesRef = collection(db, 'profiles');
        const snapshot = await getDocs(profilesRef);
        
        const searchLower = searchQuery.toLowerCase().trim();
        const results = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Profile))
          .filter(profile => {
            if (profile.id === user?.uid) return false;
            if (!profile.username) return false;
            
            const username = profile.username.toLowerCase();
            return username.includes(searchLower) || username.startsWith(searchLower);
          })
          .slice(0, 15);

        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || sending) return;

    setSending(true);
    const tempMessage: Message = {
      id: crypto.randomUUID(),
      content: newMessage.trim(),
      sender_id: user!.uid,
      receiver_id: selectedUser.id,
      created_at: Timestamp.now(),
      status: 'sending',
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      await addDoc(collection(db, 'private_messages'), {
        content: tempMessage.content,
        sender_id: user!.uid,
        receiver_id: selectedUser.id,
        sender_name: user!.displayName,
        receiver_name: selectedUser.username,
        created_at: Timestamp.now(),
        read: false,
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="h-screen w-screen bg-white flex overflow-hidden fixed inset-0">
      <Helmet>
        <title>Messages - Olam Chat</title>
      </Helmet>

      {/* Sidebar */}
      <div className="w-[280px] bg-[#fafafa] border-r border-gray-200 flex flex-col">
        {/* User Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              avatarUrl={user.photoURL || undefined}
              username={user.displayName || 'User'}
              userId={user.uid}
              size={40}
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-black truncate">{user.displayName}</div>
              <div className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                Online
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
            />
          </div>
        </div>

        <div className="px-5 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wide">
          {searchQuery ? 'Search Results' : 'Messages'}
        </div>

        <div className="flex-1 overflow-y-auto">
          {searchQuery && searchResults.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No users found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((profile) => (
              <button
                key={profile.id}
                onClick={() => {
                  setSelectedUser(profile);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
              >
                <Avatar
                  avatarUrl={profile.avatar_url}
                  username={profile.username}
                  userId={profile.id}
                  size={40}
                />
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-sm text-black mb-0.5">{profile.username}</div>
                  <div className="text-xs text-gray-500">Click to start conversation</div>
                </div>
              </button>
            ))
          ) : conversations.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Mail className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Search for users to start chatting</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => setSelectedUser({ id: conv.userId, username: conv.username, avatar_url: conv.avatarUrl, online: conv.online, last_seen: null })}
                className={`w-full px-5 py-3 flex items-center gap-3 transition-all duration-200 border-b border-gray-100 ${
                  selectedUser?.id === conv.userId 
                    ? 'bg-blue-50 border-l-4 border-l-blue-600 shadow-sm' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="relative">
                  <Avatar
                    avatarUrl={conv.avatarUrl}
                    username={conv.username}
                    userId={conv.userId}
                    size={44}
                  />
                  {conv.online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold text-sm truncate ${
                      selectedUser?.id === conv.userId ? 'text-blue-600' : 'text-black'
                    }`}>{conv.username}</span>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{formatListTime(conv.lastMessageTime)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[13px] truncate ${
                      conv.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'
                    }`}>{truncateMessage(conv.lastMessage)}</p>
                    {conv.unreadCount > 0 && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUser ? (
          <>
            <div className="px-8 py-5 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar
                    avatarUrl={selectedUser.avatar_url}
                    username={selectedUser.username}
                    userId={selectedUser.id}
                    size={44}
                  />
                  {selectedUser.online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-black text-base">{selectedUser.username}</div>
                  {selectedUser.online ? (
                    <div className="text-xs text-green-600 font-medium">Online</div>
                  ) : selectedUser.last_seen ? (
                    <div className="text-xs text-gray-500">Last seen {formatRelativeTime(selectedUser.last_seen)}</div>
                  ) : (
                    <div className="text-xs text-gray-500">Offline</div>
                  )}
                </div>
              </div>
              <div className="flex gap-4">
                <button className="text-gray-600 hover:text-gray-900 transition-colors" title="Call">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="text-gray-600 hover:text-gray-900 transition-colors" title="Video Call">
                  <Mail className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8 bg-[#fafafa]">
              {messages.map((msg, index) => {
                const isSent = msg.sender_id === user.uid;
                const msgUser = isSent ? user : selectedUser;
                const msgUsername = isSent ? (user.displayName || 'User') : selectedUser.username;
                const msgAvatar = isSent ? (user.photoURL || undefined) : selectedUser.avatar_url;
                const msgUserId = isSent ? user.uid : selectedUser.id;
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const isGrouped = shouldGroupMessages(msg, prevMsg);
                
                return (
                  <div key={msg.id} className={`flex items-end gap-2.5 ${isGrouped ? 'mb-1' : 'mb-4'} ${isSent ? 'flex-row-reverse' : ''}`}>
                    {!isGrouped ? (
                      <Avatar
                        avatarUrl={msgAvatar}
                        username={msgUsername}
                        userId={msgUserId}
                        size={36}
                      />
                    ) : (
                      <div className="w-9" />
                    )}
                    <div className="flex flex-col max-w-[60%]">
                      <div 
                        className={`group relative bg-[#2c2c2c] text-white px-4 py-2.5 rounded-[18px] text-[14px] leading-relaxed break-words transition-all hover:shadow-md ${
                          isSent ? 'rounded-br-sm' : 'rounded-bl-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                      {!isGrouped && (
                        <div className={`text-[11px] text-gray-500 mt-1 px-1 flex items-center gap-1 ${isSent ? 'flex-row-reverse' : ''}`}>
                          <span>{formatTime(msg.created_at)}</span>
                          {isSent && msg.read && (
                            <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                            </svg>
                          )}
                          {isSent && !msg.read && (
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-8 py-5 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <button type="button" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Type a message..."
                    className="w-full px-5 py-3 border border-gray-200 rounded-[25px] text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    disabled={sending}
                    maxLength={1000}
                  />
                  {newMessage.length > 800 && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      {newMessage.length}/1000
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="w-11 h-11 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                  title="Send message (Enter)"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
            <div className="text-center max-w-sm px-6">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Olam Chat</h3>
              <p className="text-gray-600 mb-2">Select a conversation from the sidebar to start messaging</p>
              <p className="text-sm text-gray-500">or use the search bar to find someone new</p>
            </div>
          </div>
        )}
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} />
    </div>
  );
};
