import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';
import { Search, Phone, MoreVertical, Send, Paperclip, Smile, Loader2, Pin, Check, CheckCheck } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs, Timestamp, updateDoc, doc, writeBatch } from 'firebase/firestore';
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
  isTyping?: boolean;
}

export const Dashboard = () => {
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
      if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Fetch conversations
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

          if (!conversationMap.has(otherUserId)) {
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

      // Fetch profiles for avatars and online status
      const profilesRef = collection(db, 'profiles');
      const profilesSnapshot = await getDocs(profilesRef);
      
      profilesSnapshot.forEach((doc) => {
        const profile = doc.data();
        const conversation = conversationMap.get(doc.id);
        if (conversation) {
          conversation.avatarUrl = profile.avatar_url;
          conversation.online = profile.online;
          conversation.username = profile.username;
        }
      });

      // Count unread messages
      const unreadQuery = query(
        messagesRef,
        where('receiver_id', '==', user.uid),
        where('read', '==', false)
      );
      const unreadSnapshot = await getDocs(unreadQuery);
      
      unreadSnapshot.forEach((doc) => {
        const msg = doc.data();
        const conversation = conversationMap.get(msg.sender_id);
        if (conversation) {
          conversation.unreadCount++;
        }
      });

      setConversations(Array.from(conversationMap.values()));
    };

    updateConversations();

    // Listen for new messages
    const messagesRef = collection(db, 'private_messages');
    const q = query(messagesRef, where('receiver_id', '==', user.uid), orderBy('created_at', 'desc'));
    
    const unsubscribe = onSnapshot(q, () => {
      updateConversations();
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!user || !selectedUser) return;

    const messagesRef = collection(db, 'private_messages');
    const q1 = query(
      messagesRef,
      where('sender_id', '==', user.uid),
      where('receiver_id', '==', selectedUser.id),
      orderBy('created_at', 'asc')
    );
    const q2 = query(
      messagesRef,
      where('sender_id', '==', selectedUser.id),
      where('receiver_id', '==', user.uid),
      orderBy('created_at', 'asc')
    );

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(prev => {
        const combined = [...prev.filter(m => m.sender_id !== user.uid || m.receiver_id !== selectedUser.id), ...msgs];
        return combined.sort((a, b) => {
          const aTime = a.created_at?.toMillis?.() || 0;
          const bTime = b.created_at?.toMillis?.() || 0;
          return aTime - bTime;
        });
      });
    });

    const unsubscribe2 = onSnapshot(q2, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(prev => {
        const combined = [...prev.filter(m => m.sender_id !== selectedUser.id || m.receiver_id !== user.uid), ...msgs];
        return combined.sort((a, b) => {
          const aTime = a.created_at?.toMillis?.() || 0;
          const bTime = b.created_at?.toMillis?.() || 0;
          return aTime - bTime;
        });
      });

      // Mark messages as read (batch update, max 5 at a time)
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

  // Handle search
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const profilesRef = collection(db, 'profiles');
      const snapshot = await getDocs(profilesRef);
      
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Profile))
        .filter(profile => 
          profile.id !== user?.uid &&
          profile.username.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 10);

      setSearchResults(results);
      setIsSearching(false);
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || sending) return;

    setSending(true);
    const tempId = crypto.randomUUID();
    const tempMessage: Message = {
      id: tempId,
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
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setSelectedUser({
      id: conversation.userId,
      username: conversation.username,
      avatar_url: conversation.avatarUrl,
      online: conversation.online,
      last_seen: null,
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const selectSearchResult = (profile: Profile) => {
    setSelectedUser(profile);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Helmet>
        <title>Messages - Olam Chat</title>
      </Helmet>

      {/* Left Sidebar - Conversations */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {searchResults.length > 0 ? (
            searchResults.map((profile) => (
              <button
                key={profile.id}
                onClick={() => selectSearchResult(profile)}
                className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
              >
                <div className="relative">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                      {profile.username[0]?.toUpperCase()}
                    </div>
                  )}
                  {profile.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">{profile.username}</p>
                  <p className="text-sm text-gray-500">Start a conversation</p>
                </div>
              </button>
            ))
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.userId}
                onClick={() => selectConversation(conversation)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                  selectedUser?.id === conversation.userId ? 'bg-primary-50' : ''
                }`}
              >
                <div className="relative">
                  {conversation.avatarUrl ? (
                    <img
                      src={conversation.avatarUrl}
                      alt={conversation.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                      {conversation.username[0]?.toUpperCase()}
                    </div>
                  )}
                  {conversation.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-900 truncate">{conversation.username}</p>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTime(conversation.lastMessageTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.isTyping ? (
                        <span className="text-primary-600 italic">is typing...</span>
                      ) : (
                        conversation.lastMessage
                      )}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full flex-shrink-0">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {selectedUser.avatar_url ? (
                    <img
                      src={selectedUser.avatar_url}
                      alt={selectedUser.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                      {selectedUser.username[0]?.toUpperCase()}
                    </div>
                  )}
                  {selectedUser.online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedUser.username}</h3>
                  <p className="text-xs text-green-600">
                    {selectedUser.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Pin className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => {
                const isSent = message.sender_id === user.uid;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-2xl ${
                        isSent
                          ? 'bg-gray-900 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-xs opacity-70">{formatTime(message.created_at)}</span>
                        {isSent && (
                          <span className="opacity-70">
                            {message.status === 'sending' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : message.read ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write a Message"
                  className="flex-1 px-4 py-3 bg-gray-50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-3 bg-gray-900 hover:bg-gray-800 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No conversation selected</h3>
              <p className="text-gray-500">Choose a conversation from the list or search for someone</p>
            </div>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
      />
    </div>
  );
};
