import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, Bell, MoreVertical, Check, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AlertModal } from './AlertModal';

interface Message {
  id: string;
  content: string;
  user_id: string;
  username: string;
  created_at: string;
  status?: 'sending' | 'sent' | 'delivered';
}

interface MessageBoxProps {
  user: any;
}

export const MessageBox: React.FC<MessageBoxProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [unreadCount, setUnreadCount] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      const behavior = messages.length > 0 ? 'smooth' : 'auto';
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, [messages.length]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) throw error;
        if (data) {
          setMessages(data.map(msg => ({ ...msg, status: 'delivered' })));
          scrollToBottom();
        }
      } catch (error: any) {
        showError(error.message);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel('public-chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages((prev) => [...prev, { ...newMessage, status: 'delivered' }]);
        if (newMessage.user_id !== user.id) {
          messageSound.play().catch(() => {});
          setUnreadCount((prev) => prev + 1);
        }
        scrollToBottom();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user.id, scrollToBottom]);

  const showError = (message: string) => {
    setAlertType('error');
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    const tempId = crypto.randomUUID();
    const tempMessage: Message = {
      id: tempId,
      content: newMessage.trim(),
      user_id: user.id,
      username: user.user_metadata.username || user.email,
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    scrollToBottom();
    setLoading(true);

    try {
      const startTime = Date.now();
      const { error, data } = await supabase
        .from('messages')
        .insert([{
          content: tempMessage.content,
          user_id: user.id,
          username: user.user_metadata.username || user.email,
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
    } catch (error: any) {
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = () => {
    setUnreadCount(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = (messageId: string) => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;

    if (isLeftSwipe) {
      // Handle message action (e.g., reply, delete)
      console.log('Swiped message:', messageId);
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

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden max-w-4xl mx-auto h-full flex flex-col">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Global Chat Room</h1>
          <p className="text-sm md:text-base text-gray-400">Connected as {user.email}</p>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center space-x-2 bg-primary-600 px-3 py-1 rounded-full">
            <Bell className="h-4 w-4" />
            <span className="text-sm">{unreadCount} new</span>
          </div>
        )}
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-4"
        onScroll={handleScroll}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.user_id === user.id ? 'justify-end' : 'justify-start'}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => handleTouchEnd(message.id)}
          >
            <div
              className={`group relative max-w-[85%] md:max-w-[70%] rounded-lg p-2 md:p-3 ${
                message.user_id === user.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-700 text-white'
              } transform transition-all duration-200 hover:scale-[1.02] touch-action-pan-y`}
            >
              <div className="flex justify-between items-start gap-2">
                <p className="text-xs md:text-sm font-medium mb-1">
                  {message.user_id === user.id ? 'You' : message.username}
                </p>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
              <p className="break-words text-sm md:text-base">{message.content}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[10px] md:text-xs text-gray-300">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
                {message.user_id === user.id && (
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

      <form onSubmit={handleSendMessage} className="sticky bottom-0 p-2 md:p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 min-h-[44px] rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500 transition-all duration-200 text-sm md:text-base"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="min-w-[44px] min-h-[44px] p-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transform hover:scale-105"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>

      <AlertModal
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        message={alertMessage}
        type={alertType}
      />
    </div>
  );
};