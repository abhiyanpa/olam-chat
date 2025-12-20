import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';
import { Search, Users, Settings, Send, Paperclip, Image, Smile, MessageSquare, Loader2, ChevronLeft, ChevronRight, Check, CheckCheck } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs, Timestamp } from 'firebase/firestore';
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
  lastMessage: string;
  lastMessageTime: any;
  unreadCount: number;
  online: boolean;
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
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to format timestamps safely
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return '';
    }
  };

  const formatLastSeen = (timestamp: any) => {
    if (!timestamp) return 'Offline';
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return 'Last seen ' + date.toLocaleString();
    } catch {
      return 'Offline';
    }
  };

  // Fetch conversations (users you've messaged with)
  useEffect(() => {
    if (!user) return;

    const messagesRef = collection(db, 'private_messages');
    const q1 = query(
      messagesRef,
      where('sender_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );
    
    const q2 = query(
      messagesRef,
      where('receiver_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );

    const unsubscribe1 = onSnapshot(q1, async (snapshot) => {
      await updateConversations();
    });

    const unsubscribe2 = onSnapshot(q2, async (snapshot) => {
      await updateConversations();
      // Mark messages as read when received
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          if (msg.sender_id !== user.uid && !msg.read) {
            messageSound.play().catch(() => {});
          }
        }
      });
    });

    // Initial fetch
    updateConversations();

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user]);

  const updateConversations = async () => {
    if (!user) return;

    try {
      const messagesRef = collection(db, 'private_messages');
      
      // Query for sent messages
      const q1 = query(
        messagesRef,
        where('sender_id', '==', user.uid),
        orderBy('created_at', 'desc')
      );
      
      // Query for received messages
      const q2 = query(
        messagesRef,
        where('receiver_id', '==', user.uid),
        orderBy('created_at', 'desc')
      );

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);

      const userIds = new Set<string>();
      const lastMessages = new Map<string, any>();
      const unreadCounts = new Map<string, number>();

      // Process sent messages
      sentSnapshot.docs.forEach(doc => {
        const msg = doc.data();
        const otherUserId = msg.receiver_id;
        
        userIds.add(otherUserId);
        
        if (!lastMessages.has(otherUserId)) {
          lastMessages.set(otherUserId, {
            content: msg.content,
            time: msg.created_at
          });
        }
      });

      // Process received messages
      receivedSnapshot.docs.forEach(doc => {
        const msg = doc.data();
        const otherUserId = msg.sender_id;
        
        userIds.add(otherUserId);
        
        const existingTime = lastMessages.get(otherUserId)?.time;
        const currentTime = msg.created_at;
        
        // Update if this is more recent or doesn't exist
        if (!existingTime || (currentTime?.toMillis && existingTime?.toMillis && currentTime.toMillis() > existingTime.toMillis())) {
          lastMessages.set(otherUserId, {
            content: msg.content,
            time: msg.created_at
          });
        }

        if (!msg.read) {
          unreadCounts.set(otherUserId, (unreadCounts.get(otherUserId) || 0) + 1);
        }
      });

      // Fetch user profiles for conversations
      if (userIds.size > 0) {
        const profilesRef = collection(db, 'profiles');
        const profilesSnapshot = await getDocs(profilesRef);
        
        const convos: Conversation[] = [];
        profilesSnapshot.docs.forEach(doc => {
          const profile = doc.data();
          if (userIds.has(doc.id)) {
            const lastMsg = lastMessages.get(doc.id);
            convos.push({
              userId: doc.id,
              username: profile.username || 'Unknown',
              lastMessage: lastMsg?.content || '',
              lastMessageTime: lastMsg?.time,
              unreadCount: unreadCounts.get(doc.id) || 0,
              online: profile.online || false
            });
          }
        });

        // Sort by last message time
        convos.sort((a, b) => {
          const timeA = a.lastMessageTime?.toMillis ? a.lastMessageTime.toMillis() : 0;
          const timeB = b.lastMessageTime?.toMillis ? b.lastMessageTime.toMillis() : 0;
          return timeB - timeA;
        });

        setConversations(convos);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error('Error updating conversations:', error);
    }
  };

  // Search for new users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || !user) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const profilesRef = collection(db, 'profiles');
        const snapshot = await getDocs(profilesRef);
        
        const results = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Profile))
          .filter(profile => 
            profile.id !== user.uid &&
            profile.username.toLowerCase().includes(searchQuery.toLowerCase())
          );

        setSearchResults(results);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsSearching(false);
      }
    };

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      searchUsers();
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery, user]);

  useEffect(() => {
    if (!selectedUser || !user) return;

    const fetchMessages = async () => {
      const messagesRef = collection(db, 'private_messages');
      
      // Query for messages sent by current user to selected user
      const q1 = query(
        messagesRef,
        where('sender_id', '==', user.uid),
        where('receiver_id', '==', selectedUser.id),
        orderBy('created_at', 'asc')
      );
      
      // Query for messages sent by selected user to current user
      const q2 = query(
        messagesRef,
        where('sender_id', '==', selectedUser.id),
        where('receiver_id', '==', user.uid),
        orderBy('created_at', 'asc')
      );

      const unsubscribe1 = onSnapshot(q1, () => {
        updateMessages();
      });

      const unsubscribe2 = onSnapshot(q2, (snapshot) => {
        updateMessages();
        // Play sound for new incoming messages
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            messageSound.play().catch(() => {});
          }
        });
      });

      const updateMessages = async () => {
        try {
          const [snapshot1, snapshot2] = await Promise.all([
            getDocs(q1),
            getDocs(q2)
          ]);

          const allMessages: Message[] = [];
          
          snapshot1.docs.forEach(doc => {
            allMessages.push({
              id: doc.id,
              ...doc.data(),
              status: 'delivered'
            } as Message);
          });

          snapshot2.docs.forEach(doc => {
            allMessages.push({
              id: doc.id,
              ...doc.data(),
              status: 'delivered'
            } as Message);
          });

          // Sort by timestamp
          allMessages.sort((a, b) => {
            const timeA = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
            const timeB = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
            return timeA - timeB;
          });

          setMessages(allMessages);

          // Mark received messages as read (limited batching for free tier)
          const unreadMessages = snapshot2.docs.filter(doc => !doc.data().read).slice(0, 5);
          if (unreadMessages.length > 0) {
            const { updateDoc } = await import('firebase/firestore');
            for (const msgDoc of unreadMessages) {
              await updateDoc(msgDoc.ref, { read: true }).catch(() => {});
            }
            await updateConversations();
          }

          scrollToBottom();
        } catch (error) {
          console.error('Error updating messages:', error);
        }
      };

      await updateMessages();

      return () => {
        unsubscribe1();
        unsubscribe2();
      };
    };

    const unsubscribePromise = fetchMessages();

    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe?.());
    };
  }, [selectedUser, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !user) return;

    const tempId = crypto.randomUUID();
    const tempMessage: Message = {
      id: tempId,
      content: newMessage.trim(),
      sender_id: user.uid,
      receiver_id: selectedUser.id,
      created_at: new Date().toISOString(),
      read: false,
      status: 'sending'
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    scrollToBottom();

    try {
      const startTime = Date.now();
      const messagesRef = collection(db, 'private_messages');
      const docRef = await addDoc(messagesRef, {
        content: tempMessage.content,
        sender_id: user.uid,
        receiver_id: selectedUser.id,
        created_at: Timestamp.now(),
        read: false
      });

      const elapsedTime = Date.now() - startTime;
      const remainingDelay = Math.max(0, 500 - elapsedTime);

      await new Promise(resolve => setTimeout(resolve, remainingDelay));

      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { 
            ...msg, 
            id: docRef.id, 
            status: 'delivered' 
          } : msg
        )
      );

      // Update conversations
      await updateConversations();
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      console.error('Error sending message:', error);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && !isSidebarCollapsed) {
      setIsSidebarCollapsed(true);
    } else if (isRightSwipe && isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const getMessageStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'sent':
        return <Check className="h-3 w-3" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - Olam Chat</title>
        <meta name="description" content="Chat with people from around the world" />
      </Helmet>

      <div 
        className="h-screen bg-gray-900 text-white"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="h-full flex">
          {/* Sidebar */}
          <div 
            className={`fixed md:relative bg-gray-800 border-r border-gray-700 h-full flex flex-col transition-all duration-300 z-10 ${
              isSidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-[280px] md:w-80'
            }`}
          >
            <div className="p-4 flex items-center justify-between">
              {!isSidebarCollapsed && (
                <div className="relative flex-1">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isSearching ? 'animate-pulse text-primary-400' : 'text-gray-400'} h-5 w-5`} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-[44px] pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors ml-2 min-w-[44px] min-h-[44px]"
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {searchQuery ? (
                // Show search results when searching
                searchResults.length === 0 ? (
                  <div className="text-center p-4 text-gray-400">
                    {isSearching ? 'Searching...' : 'No users found'}
                  </div>
                ) : (
                  searchResults.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={async () => {
                        setSelectedUser(profile);
                        setSearchQuery('');
                        if (window.innerWidth < 768) {
                          setIsSidebarCollapsed(true);
                        }
                      }}
                      className={`w-full min-h-[64px] p-4 flex items-center space-x-3 hover:bg-gray-700 transition-colors ${
                        selectedUser?.id === profile.id ? 'bg-gray-700' : ''
                      }`}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
                          {profile.username[0].toUpperCase()}
                        </div>
                        {profile.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                        )}
                      </div>
                      {!isSidebarCollapsed && (
                        <div className="flex-1 text-left">
                          <h3 className="font-medium truncate">{profile.username}</h3>
                          <p className="text-sm text-gray-400">
                            {profile.online ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      )}
                    </button>
                  ))
                )
              ) : (
                // Show conversations when not searching
                conversations.length === 0 ? (
                  <div className="text-center p-4 text-gray-400">
                    <p>No conversations yet</p>
                    <p className="text-xs mt-2">Search for users to start chatting</p>
                  </div>
                ) : (
                  conversations.map((convo) => (
                    <button
                      key={convo.userId}
                      onClick={async () => {
                        // Fetch user profile
                        const { doc: docRef, getDoc } = await import('firebase/firestore');
                        const profileDoc = await getDoc(docRef(db, 'profiles', convo.userId));
                        if (profileDoc.exists()) {
                          setSelectedUser({
                            id: convo.userId,
                            ...profileDoc.data()
                          } as Profile);
                        }
                        if (window.innerWidth < 768) {
                          setIsSidebarCollapsed(true);
                        }
                      }}
                      className={`w-full min-h-[64px] p-4 flex items-center space-x-3 hover:bg-gray-700 transition-colors ${
                        selectedUser?.id === convo.userId ? 'bg-gray-700' : ''
                      }`}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
                          {convo.username[0].toUpperCase()}
                        </div>
                        {convo.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                        )}
                      </div>
                      {!isSidebarCollapsed && (
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate">{convo.username}</h3>
                            {convo.unreadCount > 0 && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-primary-600 rounded-full">
                                {convo.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 truncate">
                            {convo.lastMessage}
                          </p>
                        </div>
                      )}
                    </button>
                  ))
                )
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <button 
                onClick={() => setShowSettings(true)}
                className={`min-h-[44px] px-4 py-2 flex items-center justify-center space-x-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors w-full`}
              >
                <Settings className="h-5 w-5" />
                {!isSidebarCollapsed && <span>Settings</span>}
              </button>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {isSidebarCollapsed && (
                      <button
                        onClick={() => setIsSidebarCollapsed(false)}
                        className="md:hidden p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    )}
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
                      {selectedUser.username[0].toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-medium">{selectedUser.username}</h2>
                      <p className="text-sm text-gray-400">
                        {selectedUser.online ? 'Online' : formatLastSeen(selectedUser.last_seen)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button className="min-w-[44px] min-h-[44px] p-2 hover:bg-gray-700 rounded-lg transition-colors">
                      <Users className="h-5 w-5 text-gray-400" />
                    </button>
                    <button className="min-w-[44px] min-h-[44px] p-2 hover:bg-gray-700 rounded-lg transition-colors">
                      <Settings className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`group relative max-w-[85%] md:max-w-[70%] rounded-lg p-2 md:p-3 ${
                          message.sender_id === user.uid
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-700 text-white'
                        } transform transition-all duration-200 hover:scale-[1.02]`}
                      >
                        <p className="break-words text-sm md:text-base">{message.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] md:text-xs text-gray-300">
                            {formatTime(message.created_at)}
                          </span>
                          {message.sender_id === user.uid && (
                            <span className="text-gray-300">
                              {getMessageStatusIcon(message.status)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="sticky bottom-0 p-2 md:p-4 border-t border-gray-700 bg-gray-800">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      className="min-w-[44px] min-h-[44px] p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="min-w-[44px] min-h-[44px] p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <Image className="h-5 w-5" />
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 min-h-[44px] bg-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm md:text-base"
                    />
                    <button
                      type="button"
                      className="min-w-[44px] min-h-[44px] p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    <button
                      type="submit"
                      className="min-w-[44px] min-h-[44px] p-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors transform hover:scale-105"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h2 className="text-xl font-medium text-gray-400">
                    Select a chat to start messaging
                  </h2>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
      />
    </>
  );
};