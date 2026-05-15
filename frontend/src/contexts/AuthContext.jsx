// Authentication Context - handles both Firebase and Demo mode auth
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, IS_DEMO_MODE } from '../firebase/config';
import { DEMO_USERS, DEMO_CREDENTIALS } from '../data/demoData';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for persisted demo session
    if (IS_DEMO_MODE) {
      const savedUser = localStorage.getItem('slmrs_demo_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          setUserProfile(parsed);
        } catch (e) {
          localStorage.removeItem('slmrs_demo_user');
        }
      }
      setLoading(false);
      return;
    }

    // Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserProfile({ uid: firebaseUser.uid, ...userDoc.data() });
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    setError(null);
    setLoading(true);
    
    try {
      if (IS_DEMO_MODE) {
        // Demo mode login
        const demoUser = Object.values(DEMO_USERS).find(u => u.email === email);
        if (!demoUser) {
          throw new Error('Invalid credentials. Use demo accounts shown below.');
        }
        // Simulate auth delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setUser(demoUser);
        setUserProfile(demoUser);
        localStorage.setItem('slmrs_demo_user', JSON.stringify(demoUser));
        return demoUser;
      }

      // Firebase login
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists()) {
        const profile = { uid: result.user.uid, ...userDoc.data() };
        setUserProfile(profile);
        return profile;
      }
      throw new Error('User profile not found in database.');
    } catch (err) {
      const message = err.code === 'auth/invalid-credential' 
        ? 'Invalid email or password'
        : err.message;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (IS_DEMO_MODE) {
        localStorage.removeItem('slmrs_demo_user');
      } else {
        await firebaseSignOut(auth);
      }
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const registerUser = async (email, password, userData) => {
    setError(null);
    try {
      if (IS_DEMO_MODE) {
        throw new Error('Registration disabled in demo mode');
      }
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', result.user.uid), {
        ...userData,
        uid: result.user.uid,
        email,
        createdAt: new Date(),
      });
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    error,
    signIn,
    signOut,
    registerUser,
    isAuthenticated: !!user,
    isAuthority: userProfile?.role === 'authority',
    isShop: userProfile?.role === 'shop',
    isBuyer: userProfile?.role === 'buyer',
    isDemoMode: IS_DEMO_MODE,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
