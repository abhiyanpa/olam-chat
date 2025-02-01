import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';
import { Search, Users, Settings, Send, Paperclip, Image, Smile, MessageSquare, Loader2, ChevronLeft, ChevronRight, Check, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { SettingsModal } from '../components/SettingsModal';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  online: boolean;
  last_seen: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  status?: 'sending' | 'sent' | 'delivered';
}

export const Dashboard = () => {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
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

  useEffect(() => {
    const fetchUsers = async () => {
      setIsSearching(true);
      try {
        let query = supabase
          .from('profiles')
          .select('*')
          .neq('id', user?.id)
          .order('username');

        if (searchQuery) {
          query = query.ilike('username', `%${searchQuery}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching users:', error);
          return;
        }

        setUsers(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    if (user) {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      const timeout = setTimeout(() => {
        fetchUsers();
      }, 300);

      setSearchTimeout(timeout);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [user, searchQuery]);

  useEffect(() => {
    if (!selectedUser || !user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('private_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data?.map(msg => ({ ...msg, status: 'delivered' })) || []);
      scrollToBottom();
    };

    fetchMessages();

    const channel = supabase.channel('private-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `sender_id=eq.${selectedUser.id},receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((current) => [...current, { ...newMessage, status: 'delivered' }]);
          messageSound.play().catch(() => {});
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedUser, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !user) return;

    const tempId = crypto.randomUUID();
    const tempMessage: Message = {
      id: tempId,
      content: newMessage.trim(),
      sender_id: user.id,
      receiver_id: selectedUser.id,
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    scrollToBottom();

    try {
      const startTime = Date.now();
      const { error, data } = await supabase
        .from('private_messages')
        .insert([{
          content: tempMessage.content,
          sender_id: user.id,
          receiver_id: selectedUser.id,
        }])
        .select()
        .single();

      if (error) throw error;

      const elapsedTime = Date.now() - startTime;
      const remainingDelay = Math.max(0, 500 - elapsedTime);

      await new Promise(resolve => setTimeout(resolve, remainingDelay));

      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...data, status: 'delivered' } : msg
        )
      );
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
              {users.length === 0 ? (
                <div className="text-center p-4 text-gray-400">
                  {searchQuery ? 'No users found' : 'No users available'}
                </div>
              ) : (
                users.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      setSelectedUser(profile);
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
                        {selectedUser.online ? 'Online' : 'Last seen ' + new Date(selectedUser.last_seen).toLocaleString()}
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
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`group relative max-w-[85%] md:max-w-[70%] rounded-lg p-2 md:p-3 ${
                          message.sender_id === user.id
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-700 text-white'
                        } transform transition-all duration-200 hover:scale-[1.02]`}
                      >
                        <p className="break-words text-sm md:text-base">{message.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] md:text-xs text-gray-300">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </span>
                          {message.sender_id === user.id && (
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