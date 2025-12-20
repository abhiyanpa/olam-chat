import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';
import { Search, Phone, Mail, FileText, Send, Paperclip, Loader2 } from 'lucide-react';
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

const getGradientForUser = (userId: string): string => {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
  ];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
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

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      
      if (diff < 86400000) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
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

      const unreadQuery = query(messagesRef, where('receiver_id', '==', user.uid), where('read', '==', false));
      const unreadSnapshot = await getDocs(unreadQuery);
      
      unreadSnapshot.forEach((doc) => {
        const msg = doc.data();
        const conversation = conversationMap.get(msg.sender_id);
        if (conversation) conversation.unreadCount++;
      });

      setConversations(Array.from(conversationMap.values()));
    };

    updateConversations();

    const messagesRef = collection(db, 'private_messages');
    const q = query(messagesRef, where('receiver_id', '==', user.uid), orderBy('created_at', 'desc'));
    
    const unsubscribe = onSnapshot(q, () => {
      updateConversations();
    });

    return () => unsubscribe();
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
    <div className="h-screen bg-white flex overflow-hidden max-w-[1400px] mx-auto">
      <Helmet>
        <title>Messages - Olam Chat</title>
      </Helmet>

      {/* Sidebar */}
      <div className="w-[280px] bg-[#fafafa] border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300"
            />
          </div>
        </div>

        <div className="px-5 py-5 text-lg font-semibold text-black">Messages</div>

        <div className="flex-1 overflow-y-auto">
          {searchResults.length > 0 ? (
            searchResults.map((profile) => (
              <button
                key={profile.id}
                onClick={() => {
                  setSelectedUser(profile);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="w-full px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
              >
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  style={{ background: getGradientForUser(profile.id) }}
                />
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-sm text-black mb-1">{profile.username}</div>
                  <div className="text-xs text-gray-500">Start conversation</div>
                </div>
              </button>
            ))
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => setSelectedUser({ id: conv.userId, username: conv.username, avatar_url: conv.avatarUrl, online: conv.online, last_seen: null })}
                className={`w-full px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedUser?.id === conv.userId ? 'bg-gray-100' : ''
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  style={conv.avatarUrl ? {
                    backgroundImage: `url(${conv.avatarUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  } : {
                    background: getGradientForUser(conv.userId)
                  }}
                />
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-black">{conv.username}</span>
                    <span className="text-xs text-gray-500 ml-2">{formatListTime(conv.lastMessageTime)}</span>
                  </div>
                  <div className="text-[13px] text-gray-600 truncate">{conv.lastMessage}</div>
                </div>
                {conv.unreadCount > 0 && (
                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUser ? (
          <>
            <div className="px-8 py-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full"
                  style={selectedUser.avatar_url ? {
                    backgroundImage: `url(${selectedUser.avatar_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  } : {
                    background: getGradientForUser(selectedUser.id)
                  }}
                />
                <div>
                  <div className="font-semibold text-black">{selectedUser.username}</div>
                  {selectedUser.online && (
                    <div className="text-xs text-green-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                      Online
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4">
                <button className="text-gray-600 text-xl hover:text-gray-900"><Phone className="w-5 h-5" /></button>
                <button className="text-gray-600 text-xl hover:text-gray-900"><Mail className="w-5 h-5" /></button>
                <button className="text-gray-600 text-xl hover:text-gray-900" onClick={() => setShowSettings(true)}><FileText className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8 bg-[#fafafa]">
              {messages.map((msg) => {
                const isSent = msg.sender_id === user.uid;
                const msgUser = isSent ? user : selectedUser;
                return (
                  <div key={msg.id} className={`flex items-end gap-2.5 mb-4 ${isSent ? 'flex-row-reverse' : ''}`}>
                    <div
                      className="w-9 h-9 rounded-full flex-shrink-0"
                      style={msgUser.avatar_url ? {
                        backgroundImage: `url(${msgUser.avatar_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      } : {
                        background: getGradientForUser(msgUser.uid || msgUser.id)
                      }}
                    />
                    <div className="flex flex-col max-w-[60%]">
                      <div className={`bg-[#2c2c2c] text-white px-4 py-2.5 rounded-[18px] text-[14px] leading-relaxed break-words ${isSent ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                        {msg.content}
                      </div>
                      <div className={`text-[11px] text-gray-500 mt-1 px-1 ${isSent ? 'text-right' : 'text-left'}`}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-8 py-5 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <button type="button" className="text-gray-600 hover:text-gray-900">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write a Message"
                  className="flex-1 px-5 py-3 border border-gray-200 rounded-[25px] text-sm focus:outline-none focus:border-gray-300"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="w-11 h-11 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose from your messages or search for someone</p>
            </div>
          </div>
        )}
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} />
    </div>
  );
};
