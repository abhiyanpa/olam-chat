// Typing indicator management using Firestore
import { db } from './firebase';
import { doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface TypingStatus {
  isTyping: boolean;
  timestamp: any;
  username: string;
}

class TypingManager {
  private typingTimeout: NodeJS.Timeout | null = null;
  private cleanupTimeout: NodeJS.Timeout | null = null;

  // Set user as typing in a conversation
  async setTyping(chatId: string, userId: string, username: string) {
    try {
      await setDoc(doc(db, 'typing_status', `${chatId}_${userId}`), {
        isTyping: true,
        timestamp: serverTimestamp(),
        username,
        chatId,
        userId
      });

      // Auto-clear after 5 seconds
      if (this.cleanupTimeout) clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = setTimeout(() => {
        this.clearTyping(chatId, userId);
      }, 5000);
    } catch (error) {
      console.warn('Failed to set typing status:', error);
    }
  }

  // Clear typing status
  async clearTyping(chatId: string, userId: string) {
    try {
      await deleteDoc(doc(db, 'typing_status', `${chatId}_${userId}`));
    } catch (error) {
      // Silently fail - document might already be deleted
    }
  }

  // Debounced typing notification
  debounceTyping(chatId: string, userId: string, username: string, delay = 3000) {
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    
    this.setTyping(chatId, userId, username);
    
    this.typingTimeout = setTimeout(() => {
      this.clearTyping(chatId, userId);
    }, delay);
  }

  // Listen to typing status
  listenToTyping(
    chatId: string, 
    currentUserId: string, 
    callback: (typingUsers: string[]) => void
  ) {
    // Listen to all typing statuses for this chat
    const docRef = doc(db, 'typing_status', `${chatId}_typing`);
    
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const typingUsers: string[] = [];
        
        Object.keys(data).forEach(key => {
          if (key !== currentUserId && data[key]?.isTyping) {
            typingUsers.push(data[key].username);
          }
        });
        
        callback(typingUsers);
      } else {
        callback([]);
      }
    });
  }

  cleanup() {
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    if (this.cleanupTimeout) clearTimeout(this.cleanupTimeout);
  }
}

export const typingManager = new TypingManager();
