// Data Context - centralized data management using Firestore or Demo data
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, addDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db, IS_DEMO_MODE } from '../firebase/config';
import { useAuth } from './AuthContext';
import { encrypt, decrypt } from '../utils/encryption';
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
  const [loading, setLoading] = useState(true);

  // BUG 7 FIX — analytics computed via useMemo, never stale
  const analytics = useMemo(() => {
    if (transactions.length === 0 && Object.keys(buyerProfiles).length === 0) {
      return DEMO_ANALYTICS;
    }
    const approved = transactions.filter((t) => t.status === 'approved');
    const rejected = transactions.filter((t) => t.status === 'rejected');

    // Build daily trend from transaction timestamps
    const trendMap = {};
    transactions.forEach((t) => {
      const d = new Date(t.timestamp).toISOString().split('T')[0];
      if (!trendMap[d]) trendMap[d] = { date: d, approved: 0, rejected: 0 };
      trendMap[d][t.status] += 1;
    });
    const dailyTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    // Alcohol distribution
    const typeMap = {};
    transactions.forEach((t) => {
      typeMap[t.alcoholType] = (typeMap[t.alcoholType] || 0) + 1;
    });
    const alcoholDistribution = Object.entries(typeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Regional hotspots
    const regionMap = {};
    transactions.forEach((t) => {
      const r = t.region || 'Unknown';
      if (!regionMap[r]) regionMap[r] = { region: r, transactions: 0, violations: 0 };
      regionMap[r].transactions += 1;
      if (t.status === 'rejected') regionMap[r].violations += 1;
    });
    const hotspotAreas = Object.values(regionMap).sort((a, b) => b.transactions - a.transactions);

    return {
      totalTransactions: transactions.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      totalRevenue: approved.reduce((sum, t) => sum + (t.amount || 0), 0),
      dailyTrend: dailyTrend.length > 0 ? dailyTrend : DEMO_ANALYTICS.dailyTrend,
      alcoholDistribution: alcoholDistribution.length > 0 ? alcoholDistribution : DEMO_ANALYTICS.alcoholDistribution,
      hotspotAreas: hotspotAreas.length > 0 ? hotspotAreas : DEMO_ANALYTICS.hotspotAreas,
      riskDistribution: DEMO_ANALYTICS.riskDistribution,
      shopActivity: DEMO_ANALYTICS.shopActivity,
      weeklyComparison: DEMO_ANALYTICS.weeklyComparison,
    };
  }, [transactions, buyerProfiles]); // ← dependencies, never stale

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
  };

  const loadFirestoreData = async () => {
    try {
      const txnSnap = await getDocs(
        query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(500))
      );
      setTransactions(txnSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const profilesSnap = await getDocs(collection(db, 'buyerProfiles'));
      const profiles = {};
      profilesSnap.docs.forEach((d) => {
        // BUG 4 FIX — decrypt sensitive fields on read
        const data = d.data();
        profiles[d.id] = {
          id: d.id,
          ...data,
          // Decrypt encrypted fields if they exist
          buyerId: data.buyerId_enc ? decrypt(data.buyerId_enc) : (data.buyerId || d.id),
        };
      });
      setBuyerProfiles(profiles);

      const policyDoc = await getDoc(doc(db, 'policies', 'current'));
      if (policyDoc.exists()) setPolicies(policyDoc.data());

      const logsSnap = await getDocs(
        query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(200))
      );
      setAuditLogs(logsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Firestore load error:', error);
      loadDemoData();
    }
  };

  // Policy Engine
  const validateTransaction = useCallback(
    (buyerId, quantity, alcoholType) => {
      const profile = buyerProfiles[buyerId];
      const policy = policies;

      if (!profile || !policy) {
        return { valid: false, reason: 'Buyer profile or policy not found' };
      }
      if (profile.blacklistStatus) {
        return { valid: false, reason: 'Buyer blacklisted' };
      }
      if (policy.emergencyFlag) {
        return { valid: false, reason: 'Emergency restriction in effect' };
      }

      // Time restriction with overnight window support (mirrors backend fix)
      const now = new Date();
      const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (policy.timeRestrictionStart && policy.timeRestrictionEnd) {
        const s = policy.timeRestrictionStart.slice(0, 5);
        const e = policy.timeRestrictionEnd.slice(0, 5);
        let outside;
        if (s <= e) {
          outside = cur < s || cur > e;
        } else {
          // Overnight: allowed if cur >= s OR cur <= e
          outside = cur < s && cur > e;
        }
        if (outside) {
          return { valid: false, reason: `Time restriction active (${s} - ${e})` };
        }
      }

      if (profile.dailyRemaining < quantity) {
        return { valid: false, reason: `Daily quota exceeded (${profile.dailyRemaining} remaining)` };
      }
      if (profile.weeklyRemaining < quantity) {
        return { valid: false, reason: `Weekly quota exceeded (${profile.weeklyRemaining} remaining)` };
      }
      if (profile.monthlyRemaining < quantity) {
        return { valid: false, reason: `Monthly quota exceeded (${profile.monthlyRemaining} remaining)` };
      }

      // Duplicate transaction guard (10-min window)
      const recentTxn = transactions.find((t) => {
        if (t.buyerId !== buyerId || t.alcoholType !== alcoholType) return false;
        const txnTime = t.timestamp instanceof Date ? t.timestamp : new Date(t.timestamp);
        return (now - txnTime) / 60000 < 10;
      });
      if (recentTxn) {
        return { valid: false, reason: 'Duplicate transaction within 10 min' };
      }

      return { valid: true, reason: null };
    },
    [buyerProfiles, policies, transactions]
  );

  // Submit transaction (BUG 4 FIX — encrypt buyer_id on POST)
  const submitTransaction = async (transactionData) => {
    const { buyerId, alcoholType, quantity } = transactionData;
    const validation = validateTransaction(buyerId, quantity, alcoholType);

    const newTxn = {
      ...transactionData,
      status: validation.valid ? 'approved' : 'rejected',
      reason: validation.reason,
      timestamp: new Date(),
      id: `txn-${Date.now()}`,
    };

    if (IS_DEMO_MODE) {
      setTransactions((prev) => [newTxn, ...prev]);

      if (validation.valid) {
        setBuyerProfiles((prev) => ({
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
        setBuyerProfiles((prev) => ({
          ...prev,
          [buyerId]: {
            ...prev[buyerId],
            riskScore: Math.min(100, (prev[buyerId].riskScore || 0) + 5),
          },
        }));
      }
    } else {
      try {
        // BUG 4 FIX: encrypt buyer_id before storing
        await addDoc(collection(db, 'transactions'), {
          ...newTxn,
          buyerId_enc: encrypt(String(buyerId)), // encrypted field
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
      setAuditLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          eventType: 'POLICY_UPDATE',
          userId: userProfile?.uid,
          role: 'authority',
          details: 'Policies updated',
          timestamp: new Date(),
        },
        ...prev,
      ]);
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

  const toggleEmergency = async () => {
    const newFlag = !policies?.emergencyFlag;
    await updatePolicies({ ...policies, emergencyFlag: newFlag });
    return newFlag;
  };

  const toggleBlacklist = async (buyerId) => {
    const profile = buyerProfiles[buyerId];
    if (!profile) return;
    const newStatus = !profile.blacklistStatus;

    if (IS_DEMO_MODE) {
      setBuyerProfiles((prev) => ({
        ...prev,
        [buyerId]: { ...prev[buyerId], blacklistStatus: newStatus },
      }));
      setAuditLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          eventType: 'BLACKLIST',
          userId: userProfile?.uid,
          role: 'authority',
          details: `Buyer ${buyerId} ${newStatus ? 'blacklisted' : 'unblacklisted'}`,
          timestamp: new Date(),
        },
        ...prev,
      ]);
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

  const getBuyerTransactions = useCallback(
    (buyerId) => transactions.filter((t) => t.buyerId === buyerId),
    [transactions]
  );

  const getShopTransactions = useCallback(
    (shopId) => transactions.filter((t) => t.shopId === shopId),
    [transactions]
  );

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

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
