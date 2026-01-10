import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useNavigate } from 'react-router-dom';
import { Search, Phone, Mail, FileText, Send, Paperclip, Loader2, Settings, Menu, Volume2, VolumeX, ArrowDown, X, ArrowLeft, Reply, Check, CheckCheck, Shield, Edit } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs, Timestamp, writeBatch, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { SettingsModal } from '../components/SettingsModal';
import { soundManager } from '../lib/sounds';
import { useResponsive } from '../hooks/useResponsive';
import { typingManager } from '../lib/typing';
import { validateMessage, messageSendLimiter } from '../lib/security';

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
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: {
    messageId: string;
    content: string;
    senderId: string;
    senderName: string;
  };
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
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [sending, setSending] = useState(false);
  const [soundMuted, setSoundMuted] = useState(() => soundManager.isSoundMuted());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { isMobile, isTablet } = useResponsive();

  const MAX_MESSAGE_LENGTH = 4096;

  // Check if user is admin
  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
        const profile = profileDoc.data();
        setIsAdmin(profile?.role === 'admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    checkAdmin();
  }, [user]);

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  const scrollToMessage = (messageId: string) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight effect
      messageElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 1500);
    }
  };

  const handleScrollToBottom = () => {
    scrollToBottom(true);
    setUnreadMessagesCount(0);
  };

  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = '40px';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 200);
    textarea.style.height = `${newHeight}px`;
  };

  const handleTyping = () => {
    if (!selectedUser || !user) return;
    const chatId = [user.uid, selectedUser.id].sort().join('_');
    typingManager.debounceTyping(chatId, user.uid, user.displayName || 'User');
  };

  const toggleSound = () => {
    const newMutedState = soundManager.toggleMute();
    setSoundMuted(newMutedState);
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [newMessage]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages]);

  // Scroll detection for scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      setShowScrollButton(!isNearBottom);
      
      if (isNearBottom) {
        setUnreadMessagesCount(0);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-close sidebar on mobile when selecting user
  useEffect(() => {
    if (isMobile && selectedUser) {
      setSidebarOpen(false);
    }
  }, [selectedUser, isMobile]);

  // Typing indicator listener
  useEffect(() => {
    if (!selectedUser || !user) return;

    const chatId = [user.uid, selectedUser.id].sort().join('_');
    const unsubscribe = typingManager.listenToTyping(chatId, user.uid, setTypingUsers);

    return () => {
      if (unsubscribe) unsubscribe();
      typingManager.clearTyping(chatId, user.uid);
    };
  }, [selectedUser, user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSettings) {
          setShowSettings(false);
        } else if (replyToMessage) {
          setReplyToMessage(null);
        } else if (isMobile && !sidebarOpen && selectedUser) {
          setSidebarOpen(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, isMobile, sidebarOpen, selectedUser]);

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

    // Clear messages and message refs when switching conversations
    setMessages([]);
    messageRefs.current.clear();

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
      
      // Play sound for new received messages
      const prevMessageCount = messages.filter(m => m.sender_id === selectedUser.id).length;
      const newMessageCount = receivedMessages.length;
      if (newMessageCount > prevMessageCount) {
        soundManager.playReceived();
      }
      
      setMessages(allMessages);

      // Auto-scroll to bottom on new messages
      setTimeout(() => scrollToBottom(true), 100);

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

    // Validate message content
    const validation = validateMessage(newMessage.trim());
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid message');
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setErrorMessage('');
      }, 3000);
      return;
    }

    // Rate limiting - max 10 messages per 10 seconds
    if (!messageSendLimiter.isAllowed(`send_${user!.uid}`, 10, 10000)) {
      setErrorMessage('You are sending messages too quickly. Please slow down.');
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setErrorMessage('');
      }, 3000);
      return;
    }

    setSending(true);
    const messageData: any = {
      content: newMessage.trim(),
      sender_id: user!.uid,
      receiver_id: selectedUser.id,
      sender_name: user!.displayName,
      receiver_name: selectedUser.username,
      created_at: Timestamp.now(),
      read: false,
      status: 'sent'
    };

    if (replyToMessage) {
      messageData.replyTo = {
        messageId: replyToMessage.id,
        content: replyToMessage.content,
        senderId: replyToMessage.sender_id,
        senderName: replyToMessage.sender_id === user!.uid ? user!.displayName : selectedUser.username
      };
    }

    const tempMessage: Message = {
      id: crypto.randomUUID(),
      ...messageData,
      status: 'sending',
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setReplyToMessage(null);
    
    // Clear typing status
    const chatId = [user!.uid, selectedUser.id].sort().join('_');
    typingManager.clearTyping(chatId, user!.uid);
    
    // Reset textarea height properly - wait for DOM to update
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
        textareaRef.current.value = ''; // Ensure DOM value is cleared
      }
    });

    try {
      await addDoc(collection(db, 'private_messages'), messageData);
      
      // Play sent sound
      soundManager.playSent();
      
      // Auto-scroll to bottom after sending
      setTimeout(() => scrollToBottom(true), 100);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B7FFF]" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="h-screen w-screen bg-[#0e1621] flex overflow-hidden fixed inset-0">
      <Helmet>
        <title>Messages - Olam Chat</title>
      </Helmet>

      {/* Sidebar */}
      <div className={`bg-[#0e1621] border-r border-[#1a2332] flex flex-col transition-transform duration-300 ease-in-out overflow-hidden ${
        isMobile 
          ? `fixed inset-y-0 left-0 z-40 w-full transform ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : isTablet
          ? `w-[320px] ${
              sidebarOpen ? 'block' : 'hidden'
            }`
          : 'w-[360px]'
      }`}>
        {/* User Header */}
        <div className="px-4 py-4 border-b border-[#1a2332] flex items-center justify-between">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-[#1a2332]"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-semibold text-white">Olam Chat</h2>
          <button className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-[#1a2332]">
            <Search className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-[#1a2332] border-0 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:bg-[#252f3f] transition-all"
            />
          </div>
        </div>

        {/* Conversations/Search Results List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2a3544] scrollbar-track-transparent">
          {searchQuery && searchResults.length === 0 ? (
            <div className="px-8 py-12 text-center">
              <Search className="w-10 h-10 text-gray-600 mx-auto mb-3 opacity-50" />
              <p className="text-sm text-gray-400">No users found</p>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((profile) => (
              <button
                key={profile.id}
                onClick={() => {
                  setSelectedUser(profile);
                  setSearchQuery('');
                  setSearchResults([]);
                  if (isMobile) setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 mx-2 my-1 rounded-lg cursor-pointer hover:bg-[#1a2332] transition-all duration-200 group"
              >
                <div className="relative flex-shrink-0">
                  <Avatar
                    avatarUrl={profile.avatar_url}
                    username={profile.username}
                    userId={profile.id}
                    size={48}
                  />
                  {profile.online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[#0e1621] rounded-full" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-white text-[15px] truncate">{profile.username}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {profile.online ? 'online' : `last seen ${formatRelativeTime(profile.last_seen)}`}
                  </div>
                </div>
              </button>
            ))
          ) : conversations.length === 0 ? (
            <div className="px-8 py-12 text-center">
              <Mail className="w-10 h-10 text-gray-600 mx-auto mb-3 opacity-50" />
              <p className="text-sm text-gray-400">No conversations yet</p>
              <p className="text-xs text-gray-500 mt-1">Search for users to start chatting</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => {
                  setSelectedUser({ id: conv.userId, username: conv.username, avatar_url: conv.avatarUrl, online: conv.online, last_seen: null });
                  if (isMobile) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 cursor-pointer transition-all duration-150 border-b border-[#1a2332]/50 ${
                  selectedUser?.id === conv.userId 
                    ? 'bg-[#1a2332]' 
                    : 'hover:bg-[#1a2332]/50 active:bg-[#1a2332]'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar
                    avatarUrl={conv.avatarUrl}
                    username={conv.username}
                    userId={conv.userId}
                    size={52}
                  />
                  {conv.online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#0e1621] rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <span className="font-medium text-white text-[15px] truncate flex-1">{conv.username}</span>
                    <span className="text-[13px] text-gray-500 ml-2 flex-shrink-0">
                      {formatListTime(conv.lastMessageTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] text-gray-400 truncate flex-1 leading-tight">{conv.lastMessage}</span>
                    {conv.unreadCount > 0 && (
                      <div className="ml-2 flex-shrink-0 min-w-[22px] h-[22px] px-1.5 bg-[#8B7FFF] text-white text-[12px] font-medium rounded-full flex items-center justify-center">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        
        {/* Floating Action Button */}
        <button
          onClick={() => {
            // Focus search to start new conversation
            const searchInput = document.querySelector('input[placeholder="Search"]') as HTMLInputElement;
            if (searchInput) searchInput.focus();
          }}
          className="absolute bottom-6 right-6 w-14 h-14 bg-[#8B7FFF] hover:bg-[#7B6FEF] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
          title="New message"
        >
          <Edit className="w-6 h-6" />
        </button>
      </div>

      {/* Menu Sidebar */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Menu */}
          <div className="fixed left-0 top-0 bottom-0 w-[280px] bg-[#0e1621] z-50 border-r border-[#1a2332] shadow-xl transform transition-transform duration-300">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="px-4 py-3 border-b border-[#1a2332] flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Menu</h3>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1a2332] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Menu Items */}
              <div className="flex-1 p-2">
                <button 
                  onClick={() => {
                    toggleSound();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-[#1a2332] rounded-lg transition-colors"
                >
                  {soundMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  <span>{soundMuted ? 'Unmute sounds' : 'Mute sounds'}</span>
                </button>
                
                {isAdmin && (
                  <button 
                    onClick={() => {
                      navigate('/admin');
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-[#1a2332] rounded-lg transition-colors"
                  >
                    <Shield className="w-5 h-5" />
                    <span>Admin Panel</span>
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    setShowSettings(true);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-[#1a2332] rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#121a24] relative overflow-hidden min-w-0">
        {selectedUser ? (
          <>
            <div className="px-4 md:px-6 py-3 border-b border-[#1a2332] flex items-center justify-between bg-[#0e1621] flex-shrink-0">
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="mr-3 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-[#1a2332]"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar
                    avatarUrl={selectedUser.avatar_url}
                    username={selectedUser.username}
                    userId={selectedUser.id}
                    size={42}
                  />
                  {selectedUser.online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[#0e1621] rounded-full" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-white text-[15px]">{selectedUser.username}</div>
                  {selectedUser.online ? (
                    <div className="text-xs text-gray-400">online</div>
                  ) : selectedUser.last_seen ? (
                    <div className="text-xs text-gray-500">last seen {formatRelativeTime(selectedUser.last_seen)}</div>
                  ) : (
                    <div className="text-xs text-gray-500">offline</div>
                  )}
                </div>
              </div>
              <button className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-[#1a2332]" title="Search in conversation">
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 md:px-6 py-2 bg-[#0e1621] border-b border-[#1a2332]">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[#8B7FFF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-[#8B7FFF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-[#8B7FFF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>
                    {typingUsers.length === 1 
                      ? `${typingUsers[0]} is typing...`
                      : `${typingUsers[0]} and ${typingUsers.length - 1} other${typingUsers.length > 2 ? 's' : ''} are typing...`
                    }
                  </span>
                </div>
              </div>
            )}

            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4 bg-[#121a24] relative scrollbar-thin scrollbar-thumb-[#2a3544] scrollbar-track-transparent"
              style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            >
              {messages.map((msg, index) => {
                const isSent = msg.sender_id === user.uid;
                const msgUser = isSent ? user : selectedUser;
                const msgUsername = isSent ? (user.displayName || 'User') : selectedUser.username;
                const msgAvatar = isSent ? (user.photoURL || undefined) : selectedUser.avatar_url;
                const msgUserId = isSent ? user.uid : selectedUser.id;
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const isGrouped = shouldGroupMessages(msg, prevMsg);
                
                return (
                  <div key={msg.id} className={`flex items-end gap-2.5 ${isGrouped ? 'mb-1' : 'mb-4'} ${isSent ? 'flex-row-reverse' : ''} group`}>
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
                    <div className="flex flex-col max-w-[60%] relative">
                      {/* Reply preview */}
                      {msg.replyTo && (
                        <div 
                          onClick={() => scrollToMessage(msg.replyTo!.messageId)}
                          className={`mb-1 px-3 py-2 bg-[#1a2332] rounded-lg text-xs cursor-pointer hover:bg-[#252f3f] transition-colors ${isSent ? 'ml-auto' : ''}`}
                        >
                          <div className="font-semibold text-gray-300 mb-1">
                            {msg.replyTo.senderName}
                          </div>
                          <div className="text-gray-400 truncate">
                            {msg.replyTo.content.substring(0, 50)}{msg.replyTo.content.length > 50 ? '...' : ''}
                          </div>
                        </div>
                      )}
                      
                      <div 
                        ref={(el) => {
                          if (el) messageRefs.current.set(msg.id, el);
                          else messageRefs.current.delete(msg.id);
                        }}
                        className={`relative ${isSent ? 'bg-[#8B7FFF]' : 'bg-[#1a2332]'} text-white px-4 py-2.5 rounded-[18px] text-[14px] leading-relaxed break-words transition-all hover:shadow-lg ${
                          isSent ? 'rounded-br-sm' : 'rounded-bl-sm'
                        }`}
                        style={{ whiteSpace: 'pre-wrap', transition: 'background-color 0.3s ease' }}
                      >
                        {msg.content}
                        
                        {/* Reply button on hover - desktop only */}
                        {!isMobile && (
                          <button
                            onClick={() => setReplyToMessage(msg)}
                            className={`absolute -top-3 ${isSent ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-[#2a3544] hover:bg-[#3a4554] rounded-full`}
                            title="Reply to message"
                          >
                            <Reply className="w-4 h-4 text-white" />
                          </button>
                        )}
                      </div>
                      {!isGrouped && (
                        <div className={`text-[11px] text-gray-500 mt-1 px-1 flex items-center gap-1 ${isSent ? 'flex-row-reverse' : ''}`}>
                          <span>{formatTime(msg.created_at)}</span>
                          {isSent && (
                            <span className="flex items-center">
                              {msg.status === 'read' || msg.read ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#8B7FFF]" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
              
              {/* Scroll to bottom button */}
              {showScrollButton && (
                <button
                  onClick={handleScrollToBottom}
                  className="fixed bottom-24 right-6 md:right-12 w-12 h-12 bg-[#8B7FFF] hover:bg-[#7B6FEF] text-white rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110 z-10"
                  aria-label="Scroll to bottom"
                >
                  <ArrowDown className="w-5 h-5" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            <div className="px-4 md:px-6 py-3 border-t border-[#1a2332] bg-[#0e1621] flex-shrink-0">
              {/* Error Message */}
              {errorMessage && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-red-300 flex-1">{errorMessage}</span>
                </div>
              )}
              
              {/* Reply Preview */}
              {replyToMessage && (
                <div className="mb-3 p-3 bg-[#1a2332] border-l-4 border-l-[#8B7FFF] rounded-lg flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Reply className="w-4 h-4 text-[#8B7FFF] flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-400">
                        Replying to {replyToMessage.sender_id === user.uid ? 'yourself' : selectedUser?.username}
                      </span>
                    </div>
                    <p className="text-sm text-white truncate">
                      {replyToMessage.content}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyToMessage(null)}
                    className="ml-2 p-1 hover:bg-[#2a3544] rounded-full transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                <button type="button" className="text-gray-400 hover:text-white transition-colors mb-2 p-2 rounded-lg hover:bg-[#1a2332]">
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Type a message..."
                    className="w-full px-4 py-3 bg-[#1a2332] border border-[#2a3544] rounded-[20px] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#8B7FFF] transition-all resize-none overflow-auto"
                    style={{ minHeight: '40px', maxHeight: '200px', lineHeight: '1.5' }}
                    disabled={sending}
                    maxLength={MAX_MESSAGE_LENGTH}
                    rows={1}
                  />
                  {newMessage.length > MAX_MESSAGE_LENGTH * 0.8 && (
                    <span className={`absolute right-4 bottom-3 text-xs px-1.5 py-0.5 bg-[#0e1621] rounded ${
                      newMessage.length >= MAX_MESSAGE_LENGTH ? 'text-red-400 font-semibold' : 'text-gray-400'
                    }`}>
                      {newMessage.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className={`w-11 h-11 mb-2 bg-[#8B7FFF] text-white rounded-full flex items-center justify-center hover:bg-[#7B6FEF] disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 flex-shrink-0 ${
                    isShaking ? 'shake' : ''
                  }`}
                  title="Send message (Enter)"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#121a24]">
            {(isMobile || isTablet) && !sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="absolute top-4 left-4 p-2 bg-[#8B7FFF] text-white rounded-full shadow-lg hover:bg-[#7B6FEF] transition-all"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <div className="text-center max-w-sm px-6">
              <div className="w-24 h-24 bg-[#8B7FFF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-12 h-12 text-[#8B7FFF]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Welcome to Olam Chat</h3>
              <p className="text-gray-400 mb-2">Select a conversation from the sidebar to start messaging</p>
              <p className="text-sm text-gray-500">or use the search bar to find someone new</p>
            </div>
          </div>
        )}
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} />
    </div>
  );
};
