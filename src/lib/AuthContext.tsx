import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        // Check if user is banned
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
        const profileData = profileDoc.data();
        
        if (profileData?.banned) {
          alert('Your account has been banned. Please contact support.');
          await signOut(auth);
          setUser(null);
          return;
        }

        // Listen for ban status changes in real-time
        const unsubscribeProfile = onSnapshot(doc(db, 'profiles', user.uid), (snapshot) => {
          const data = snapshot.data();
          if (data?.banned) {
            alert('Your account has been banned. You will be logged out.');
            signOut(auth);
            setUser(null);
          }
        });

        // Set user online
        await setDoc(doc(db, 'profiles', user.uid), {
          online: true,
          last_seen: serverTimestamp()
        }, { merge: true }).catch(() => {});

        // Set offline on tab close/refresh
        const handleBeforeUnload = async () => {
          await setDoc(doc(db, 'profiles', user.uid), {
            online: false,
            last_seen: serverTimestamp()
          }, { merge: true }).catch(() => {});
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Heartbeat to keep online status updated (every 30 seconds)
        const heartbeat = setInterval(async () => {
          if (document.visibilityState === 'visible') {
            await setDoc(doc(db, 'profiles', user.uid), {
              online: true,
              last_seen: serverTimestamp()
            }, { merge: true }).catch(() => {});
          }
        }, 30000);

        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          clearInterval(heartbeat);
          unsubscribeProfile();
        };
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);