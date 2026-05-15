// Data Context - centralized data management using Firestore or Demo data
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, addDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db, IS_DEMO_MODE } from '../firebase/config';
import { useAuth } from './AuthContext';
import {
  DEMO_TRANSACTIONS, DEMO_BUYER_PROFILES, DEMO_POLICIES,
  DEMO_AUDIT_LOGS, DEMO_ANALYTICS, DEMO_USERS,
} from '../data/demoData';

const DataContext = createContext(null);

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}

export function DataProvider({ children }) {
  const { userProfile } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [buyerProfiles, setBuyerProfiles] = useState({});
  const [policies, setPolicies] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    if (!userProfile) {
      setLoading(false);
      return;
    }
    loadData();
  }, [userProfile]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (IS_DEMO_MODE) {
        loadDemoData();
      } else {
        await loadFirestoreData();
      }
    } catch (err) {
      console.error('Error loading data:', err);
      // Fallback to demo data
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    setTransactions(DEMO_TRANSACTIONS);
    setBuyerProfiles(DEMO_BUYER_PROFILES);
    setPolicies(DEMO_POLICIES.current);
    setAuditLogs(DEMO_AUDIT_LOGS);
    setAnalytics(DEMO_ANALYTICS);
  };

  const loadFirestoreData = async () => {
    try {
      // Load transactions
      const txnSnap = await getDocs(
        query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(500))
      );
      setTransactions(txnSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Load buyer profiles
      const profilesSnap = await getDocs(collection(db, 'buyerProfiles'));
      const profiles = {};
      profilesSnap.docs.forEach(d => { profiles[d.id] = { id: d.id, ...d.data() }; });
      setBuyerProfiles(profiles);

      // Load policies
      const policyDoc = await getDoc(doc(db, 'policies', 'current'));
      if (policyDoc.exists()) setPolicies(policyDoc.data());

      // Load audit logs
      const logsSnap = await getDocs(
        query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(200))
      );
      setAuditLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Build analytics
      buildAnalytics();
    } catch (error) {
      console.error('Firestore load error:', error);
      loadDemoData();
    }
  };

  const buildAnalytics = () => {
    const approved = transactions.filter(t => t.status === 'approved');
    const rejected = transactions.filter(t => t.status === 'rejected');
    
    setAnalytics({
      totalTransactions: transactions.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      totalRevenue: approved.reduce((sum, t) => sum + (t.amount || 0), 0),
      ...DEMO_ANALYTICS, // Supplement with demo analytics structure
    });
  };

  // Policy Engine - validates a transaction against all rules
  const validateTransaction = useCallback((buyerId, quantity, alcoholType) => {
    const profile = buyerProfiles[buyerId];
    const policy = policies;
    
    if (!profile || !policy) {
      return { valid: false, reason: 'Buyer profile or policy not found' };
    }

    // Check blacklist
    if (profile.blacklistStatus) {
      return { valid: false, reason: 'Buyer blacklisted' };
    }

    // Check emergency restriction
    if (policy.emergencyFlag) {
      return { valid: false, reason: 'Emergency restriction in effect' };
    }

    // Check time restriction
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (policy.timeRestrictionStart && policy.timeRestrictionEnd) {
      const start = policy.timeRestrictionStart;
      const end = policy.timeRestrictionEnd;
      // Handle overnight restriction (e.g., 22:00 to 06:00)
      if (start > end) {
        if (currentTime >= start || currentTime <= end) {
          return { valid: false, reason: `Time restriction active (${start} - ${end})` };
        }
      } else {
        if (currentTime >= start && currentTime <= end) {
          return { valid: false, reason: `Time restriction active (${start} - ${end})` };
        }
      }
    }

    // Check daily quota
    if (profile.dailyRemaining < quantity) {
      return { valid: false, reason: `Daily quota exceeded (${profile.dailyRemaining} remaining)` };
    }

    // Check weekly quota
    if (profile.weeklyRemaining < quantity) {
      return { valid: false, reason: `Weekly quota exceeded (${profile.weeklyRemaining} remaining)` };
    }

    // Check monthly quota
    if (profile.monthlyRemaining < quantity) {
      return { valid: false, reason: `Monthly quota exceeded (${profile.monthlyRemaining} remaining)` };
    }

    // Check for duplicate transaction (same buyer, same type, within 10 minutes)
    const recentTxn = transactions.find(t => {
      if (t.buyerId !== buyerId || t.alcoholType !== alcoholType) return false;
      const txnTime = t.timestamp instanceof Date ? t.timestamp : new Date(t.timestamp);
      const diff = (now - txnTime) / 60000; // minutes
      return diff < 10;
    });
    if (recentTxn) {
      return { valid: false, reason: 'Duplicate transaction detected (same type within 10 min)' };
    }

    return { valid: true, reason: null };
  }, [buyerProfiles, policies, transactions]);

  // Submit a new transaction
  const submitTransaction = async (transactionData) => {
    const { buyerId, alcoholType, quantity } = transactionData;
    
    // Validate first
    const validation = validateTransaction(buyerId, quantity, alcoholType);
    
    const newTxn = {
      ...transactionData,
      status: validation.valid ? 'approved' : 'rejected',
      reason: validation.reason,
      timestamp: new Date(),
      id: `txn-${Date.now()}`,
    };

    if (IS_DEMO_MODE) {
      // Update demo state
      setTransactions(prev => [newTxn, ...prev]);
      
      if (validation.valid) {
        setBuyerProfiles(prev => ({
          ...prev,
          [buyerId]: {
            ...prev[buyerId],
            dailyRemaining: Math.max(0, prev[buyerId].dailyRemaining - quantity),
            weeklyRemaining: Math.max(0, prev[buyerId].weeklyRemaining - quantity),
            monthlyRemaining: Math.max(0, prev[buyerId].monthlyRemaining - quantity),
            totalPurchases: (prev[buyerId].totalPurchases || 0) + 1,
            lastPurchase: new Date(),
          },
        }));
      } else {
        // Increment risk score for rejection
        setBuyerProfiles(prev => ({
          ...prev,
          [buyerId]: {
            ...prev[buyerId],
            riskScore: Math.min(100, (prev[buyerId].riskScore || 0) + 5),
          },
        }));
      }
    } else {
      // Firebase: store transaction
      try {
        await addDoc(collection(db, 'transactions'), {
          ...newTxn,
          timestamp: serverTimestamp(),
        });

        if (validation.valid) {
          await updateDoc(doc(db, 'buyerProfiles', buyerId), {
            dailyRemaining: Math.max(0, buyerProfiles[buyerId].dailyRemaining - quantity),
            weeklyRemaining: Math.max(0, buyerProfiles[buyerId].weeklyRemaining - quantity),
            monthlyRemaining: Math.max(0, buyerProfiles[buyerId].monthlyRemaining - quantity),
          });
        } else {
          await updateDoc(doc(db, 'buyerProfiles', buyerId), {
            riskScore: Math.min(100, (buyerProfiles[buyerId].riskScore || 0) + 5),
          });
        }

        // Add audit log
        await addDoc(collection(db, 'auditLogs'), {
          eventType: validation.valid ? 'TRANSACTION' : 'REJECTION',
          userId: userProfile?.uid,
          role: userProfile?.role,
          details: `Transaction ${newTxn.id} ${newTxn.status} for ${buyerId}`,
          timestamp: serverTimestamp(),
        });

        await loadFirestoreData();
      } catch (err) {
        console.error('Error submitting transaction:', err);
        throw err;
      }
    }

    return newTxn;
  };

  // Update policies
  const updatePolicies = async (newPolicies) => {
    const updated = { ...newPolicies, lastUpdated: new Date(), updatedBy: userProfile?.uid };
    
    if (IS_DEMO_MODE) {
      setPolicies(updated);
      setAuditLogs(prev => [{
        id: `log-${Date.now()}`,
        eventType: 'POLICY_UPDATE',
        userId: userProfile?.uid,
        role: 'authority',
        details: 'Policies updated',
        timestamp: new Date(),
      }, ...prev]);
    } else {
      await setDoc(doc(db, 'policies', 'current'), updated);
      await addDoc(collection(db, 'auditLogs'), {
        eventType: 'POLICY_UPDATE',
        userId: userProfile?.uid,
        role: 'authority',
        details: 'Policies updated',
        timestamp: serverTimestamp(),
      });
      setPolicies(updated);
    }
  };

  // Toggle emergency flag
  const toggleEmergency = async () => {
    const newFlag = !policies?.emergencyFlag;
    await updatePolicies({ ...policies, emergencyFlag: newFlag });
    return newFlag;
  };

  // Toggle buyer blacklist
  const toggleBlacklist = async (buyerId) => {
    const profile = buyerProfiles[buyerId];
    if (!profile) return;
    
    const newStatus = !profile.blacklistStatus;
    
    if (IS_DEMO_MODE) {
      setBuyerProfiles(prev => ({
        ...prev,
        [buyerId]: { ...prev[buyerId], blacklistStatus: newStatus },
      }));
      setAuditLogs(prev => [{
        id: `log-${Date.now()}`,
        eventType: 'BLACKLIST',
        userId: userProfile?.uid,
        role: 'authority',
        details: `Buyer ${buyerId} ${newStatus ? 'blacklisted' : 'unblacklisted'}`,
        timestamp: new Date(),
      }, ...prev]);
    } else {
      await updateDoc(doc(db, 'buyerProfiles', buyerId), { blacklistStatus: newStatus });
      await addDoc(collection(db, 'auditLogs'), {
        eventType: 'BLACKLIST',
        userId: userProfile?.uid,
        role: 'authority',
        details: `Buyer ${buyerId} ${newStatus ? 'blacklisted' : 'unblacklisted'}`,
        timestamp: serverTimestamp(),
      });
      await loadFirestoreData();
    }
  };

  // Get transactions for a specific buyer
  const getBuyerTransactions = useCallback((buyerId) => {
    return transactions.filter(t => t.buyerId === buyerId);
  }, [transactions]);

  // Get transactions for a specific shop
  const getShopTransactions = useCallback((shopId) => {
    return transactions.filter(t => t.shopId === shopId);
  }, [transactions]);

  const value = {
    transactions,
    buyerProfiles,
    policies,
    auditLogs,
    analytics,
    loading,
    submitTransaction,
    validateTransaction,
    updatePolicies,
    toggleEmergency,
    toggleBlacklist,
    getBuyerTransactions,
    getShopTransactions,
    refreshData: loadData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
