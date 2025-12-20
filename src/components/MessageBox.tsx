import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, Bell, MoreVertical, Check, CheckCheck, Paperclip, Image as ImageIcon, X } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AlertModal } from './AlertModal';

interface Message {
  id: string;
  content: string;
  user_id: string;
  username: string;
  created_at: string;
  status?: 'sending' | 'sent' | 'delivered';
  attachment?: {
    url: string;
    type: 'image' | 'file';
    name: string;
    size: number;
  };
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      const behavior = messages.length > 0 ? 'smooth' : 'auto';
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, [messages.length]);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      orderBy('created_at', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: 'delivered'
      })) as Message[];
      
      setMessages(messagesData);
      
      // Handle new messages
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          if (msg.user_id !== user.uid) {
            messageSound.play().catch(() => {});
            setUnreadCount((prev) => prev + 1);
          }
        }
      });
      
      scrollToBottom();
    }, (error) => {
      showError(error.message);
    });

    return () => {
      unsubscribe();
    };
  }, [user.uid, scrollToBottom]);

  const showError = (message: string) => {
    setAlertType('error');
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showError('File must be less than 5MB');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: 'image' | 'file' }> => {
    const storageRef = ref(storage, `messages/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return {
      url: downloadURL,
      type: file.type.startsWith('image/') ? 'image' : 'file'
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || loading) return;

    setLoading(true);
    setUploading(true);

    const tempId = crypto.randomUUID();
    let attachment;

    try {
      // Upload file if selected
      if (selectedFile) {
        const uploadResult = await uploadFile(selectedFile);
        attachment = {
          url: uploadResult.url,
          type: uploadResult.type,
          name: selectedFile.name,
          size: selectedFile.size
        };
      }

      const tempMessage: Message = {
        id: tempId,
        content: newMessage.trim() || (attachment ? `Sent a ${attachment.type}` : ''),
        user_id: user.uid,
        username: user.displayName || user.email || 'Anonymous',
        created_at: new Date().toISOString(),
        status: 'sending',
        attachment
      };

      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      clearFileSelection();
      scrollToBottom();

      const messagesRef = collection(db, 'messages');
      const docRef = await addDoc(messagesRef, {
        content: tempMessage.content,
        user_id: user.uid,
        username: user.displayName || user.email || 'Anonymous',
        created_at: Timestamp.now(),
        ...(attachment && { attachment })
      });

      const elapsedTime = Date.now() - Date.now();
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
    } catch (error: any) {
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      showError(error.message);
    } finally {
      setLoading(false);
      setUploading(false);
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
                message.user_id === user.uid
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-700 text-white'
              } transform transition-all duration-200 hover:scale-[1.02] touch-action-pan-y`}
            >
              <div className="flex justify-between items-start gap-2">
                <p className="text-xs md:text-sm font-medium mb-1">
                  {message.user_id === user.uid ? 'You' : message.username}
                </p>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
              {message.attachment && (
                <div className="mt-2">
                  {message.attachment.type === 'image' ? (
                    <img
                      src={message.attachment.url}
                      alt={message.attachment.name}
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(message.attachment!.url, '_blank')}
                    />
                  ) : (
                    <a
                      href={message.attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-gray-600 bg-opacity-50 rounded hover:bg-opacity-75 transition-all"
                    >
                      <Paperclip className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{message.attachment.name}</p>
                        <p className="text-xs text-gray-300">{(message.attachment.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </a>
                  )}
                </div>
              )}
              <p className="break-words text-sm md:text-base">{message.content}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[10px] md:text-xs text-gray-300">
                  {formatTime(message.created_at)}
                </span>
                {message.user_id === user.uid && (
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
        {selectedFile && (
          <div className="mb-2 p-2 bg-gray-700 rounded-lg flex items-center gap-2">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="h-16 w-16 object-cover rounded" />
            ) : (
              <div className="h-16 w-16 bg-gray-600 rounded flex items-center justify-center">
                <Paperclip className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={clearFileSelection}
              className="p-1 hover:bg-gray-600 rounded transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploading}
            className="min-w-[44px] min-h-[44px] p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'image/*';
                fileInputRef.current.click();
              }
            }}
            disabled={loading || uploading}
            className="min-w-[44px] min-h-[44px] p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
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
            disabled={loading || uploading}
            className="min-w-[44px] min-h-[44px] p-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transform hover:scale-105"
          >
            {loading || uploading ? (
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