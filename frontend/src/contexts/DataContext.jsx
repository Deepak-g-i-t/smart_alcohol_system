/**
 * DataContext — real API calls via service layer (no Firebase / no demoData).
 *
 * Exported interface is identical to the old Firebase version so all
 * consuming components continue to work without changes.
 */
import {
  createContext, useContext, useState, useEffect,
  useCallback, useMemo,
} from 'react';
import { useAuth } from './AuthContext';
import * as txService   from '../api/transactionService';
import * as policyService from '../api/policyService';
import * as analyticsService from '../api/analyticsService';
import * as buyerService from '../api/buyerService';
import { getAuditLogs } from '../api/reportService';

const DataContext = createContext(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

/* ─── Analytics builder (pure computation, no imports needed) ─ */

const buildAnalyticsFromTxns = (transactions) => {
  const approved = transactions.filter((t) => t.status === 'approved');
  const rejected = transactions.filter((t) => t.status === 'rejected');

  // Daily trend — last 30 days
  const trendMap = {};
  transactions.forEach((t) => {
    const d = new Date(t.timestamp).toISOString().split('T')[0];
    if (!trendMap[d]) trendMap[d] = { date: d, approved: 0, rejected: 0 };
    trendMap[d][t.status] += 1;
  });
  const dailyTrend = Object.values(trendMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  // Alcohol distribution
  const typeMap = {};
  transactions.forEach((t) => {
    typeMap[t.alcohol_type || t.alcoholType] =
      (typeMap[t.alcohol_type || t.alcoholType] || 0) + 1;
  });
  const alcoholDistribution = Object.entries(typeMap)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Regional hotspots
  const regionMap = {};
  transactions.forEach((t) => {
    const r = t.region || t.shop_location || 'Unknown';
    if (!regionMap[r]) regionMap[r] = { region: r, transactions: 0, violations: 0 };
    regionMap[r].transactions += 1;
    if (t.status === 'rejected') regionMap[r].violations += 1;
  });
  const hotspotAreas = Object.values(regionMap).sort(
    (a, b) => b.transactions - a.transactions
  );

  return {
    totalTransactions: transactions.length,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    totalRevenue: approved.reduce((s, t) => s + (t.amount || 0), 0),
    dailyTrend,
    alcoholDistribution,
    hotspotAreas,
  };
};

/* ─── Provider ─────────────────────────────────────────────── */

export function DataProvider({ children }) {
  const { userProfile } = useAuth();

  const [transactions, setTransactions]   = useState([]);
  const [buyerProfiles, setBuyerProfiles] = useState({});
  const [policies, setPolicies]           = useState(null);
  const [auditLogs, setAuditLogs]         = useState([]);
  const [serverAnalytics, setServerAnalytics] = useState(null); // from /api/analytics
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);

  /* ─── BUG 7 FIX: analytics via useMemo — never stale ─────── */
  const analytics = useMemo(() => {
    const base = buildAnalyticsFromTxns(transactions);
    // Merge server aggregates (include daily trend from server if available)
    if (serverAnalytics) {
      return {
        ...base,
        dailyTrend: serverAnalytics.dailyTrend?.length
          ? serverAnalytics.dailyTrend
          : base.dailyTrend,
        alcoholDistribution: serverAnalytics.alcoholDistribution?.length
          ? serverAnalytics.alcoholDistribution
          : base.alcoholDistribution,
        hotspotAreas: serverAnalytics.hotspotAreas?.length
          ? serverAnalytics.hotspotAreas
          : base.hotspotAreas,
        highRiskBuyers: serverAnalytics.highRiskBuyers || 0,
      };
    }
    return base;
  }, [transactions, buyerProfiles, serverAnalytics]);

  /* ─── Load based on role ─────────────────────────────────── */
  useEffect(() => {
    if (!userProfile) return;
    loadData();
  }, [userProfile]);

  const loadData = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setError(null);
    try {
      switch (userProfile.role) {
        case 'authority':
          await loadAuthorityData();
          break;
        case 'shop':
          await loadShopData();
          break;
        case 'buyer':
          await loadBuyerData();
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('[DataContext] load error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  /* ─── Authority: load everything in parallel ─────────────── */
  const loadAuthorityData = async () => {
    const [analyticsData, policiesData, txData, logsData] = await Promise.allSettled([
      analyticsService.getSummary(),
      policyService.getCurrentPolicy(),
      txService.getAllTransactions({ limit: 200 }),
      getAuditLogs({ limit: 100 }),
    ]);

    if (analyticsData.status === 'fulfilled') setServerAnalytics(analyticsData.value);
    if (policiesData.status === 'fulfilled') setPolicies(normalizePolicy(policiesData.value));
    if (txData.status === 'fulfilled') {
      const rows = txData.value?.rows || txData.value || [];
      setTransactions(rows);
    }
    if (logsData.status === 'fulfilled') {
      setAuditLogs(logsData.value?.logs || logsData.value || []);
    }
  };

  /* ─── Shop: load shop transactions + policy ──────────────── */
  const loadShopData = async () => {
    const shopId = userProfile.id;
    const [txData, policiesData] = await Promise.allSettled([
      txService.getShopHistory(shopId),
      policyService.getCurrentPolicy(),
    ]);
    if (txData.status === 'fulfilled') setTransactions(txData.value || []);
    if (policiesData.status === 'fulfilled') setPolicies(normalizePolicy(policiesData.value));
  };

  /* ─── Buyer: load profile + purchase history + policy ────── */
  const loadBuyerData = async () => {
    const buyerId = userProfile.id;
    const [profileData, txData, policiesData] = await Promise.allSettled([
      buyerService.getBuyerProfile(buyerId),
      txService.getBuyerHistory(buyerId),
      policyService.getCurrentPolicy(),
    ]);

    if (profileData.status === 'fulfilled' && profileData.value) {
      const p = profileData.value;
      setBuyerProfiles({ [buyerId]: normalizeProfile(p, buyerId) });
    }
    if (txData.status === 'fulfilled') setTransactions(txData.value || []);
    if (policiesData.status === 'fulfilled') setPolicies(normalizePolicy(policiesData.value));
  };

  /* ─── Normalizers: snake_case → camelCase for UI ────────── */
  const normalizePolicy = (raw) => {
    if (!raw) return null;
    return {
      ...raw,
      emergencyFlag:         raw.emergency_flag ?? raw.emergencyFlag ?? false,
      timeRestrictionStart:  raw.time_restriction_start || raw.timeRestrictionStart,
      timeRestrictionEnd:    raw.time_restriction_end   || raw.timeRestrictionEnd,
      dailyLimit:            raw.daily_limit   || raw.dailyLimit,
      weeklyLimit:           raw.weekly_limit  || raw.weeklyLimit,
      monthlyLimit:          raw.monthly_limit || raw.monthlyLimit,
    };
  };

  const normalizeProfile = (raw, id) => ({
    ...raw,
    buyerId:          String(raw.buyer_id || id),
    name:             raw.name,
    dailyRemaining:   raw.daily_remaining  ?? raw.dailyRemaining  ?? 0,
    weeklyRemaining:  raw.weekly_remaining ?? raw.weeklyRemaining ?? 0,
    monthlyRemaining: raw.monthly_remaining ?? raw.monthlyRemaining ?? 0,
    dailyLimit:       raw.daily_limit  ?? raw.dailyLimit  ?? 2,
    weeklyLimit:      raw.weekly_limit ?? raw.weeklyLimit ?? 10,
    monthlyLimit:     raw.monthly_limit ?? raw.monthlyLimit ?? 30,
    riskScore:        raw.risk_score ?? raw.riskScore ?? 0,
    blacklistStatus:  raw.blacklist_status ?? raw.blacklistStatus ?? false,
    region:           raw.shop_location || raw.region || '',
  });

  /* ─── validateTransaction (client-side pre-check) ─────────── */
  const validateTransaction = useCallback(
    (buyerId, quantity, alcoholType) => {
      const profile = buyerProfiles[buyerId] || buyerProfiles[String(buyerId)];
      const policy  = policies;

      if (!profile || !policy) {
        return { valid: false, reason: 'Buyer profile or policy not loaded' };
      }
      if (profile.blacklistStatus) {
        return { valid: false, reason: 'Buyer is blacklisted' };
      }
      if (policy.emergencyFlag) {
        return { valid: false, reason: 'Emergency restriction in effect' };
      }

      // Time restriction (mirrors backend fix — overnight window support)
      const now = new Date();
      const cur = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      if (policy.timeRestrictionStart && policy.timeRestrictionEnd) {
        const s = policy.timeRestrictionStart.slice(0, 5);
        const e = policy.timeRestrictionEnd.slice(0, 5);
        const outside = s <= e ? (cur < s || cur > e) : (cur < s && cur > e);
        if (outside) {
          return { valid: false, reason: `Outside purchase hours (${s}–${e})` };
        }
      }

      if (profile.dailyRemaining < quantity) {
        return { valid: false, reason: `Daily quota exceeded (${profile.dailyRemaining} units left)` };
      }
      if (profile.weeklyRemaining < quantity) {
        return { valid: false, reason: `Weekly quota exceeded (${profile.weeklyRemaining} units left)` };
      }
      if (profile.monthlyRemaining < quantity) {
        return { valid: false, reason: `Monthly quota exceeded (${profile.monthlyRemaining} units left)` };
      }

      return { valid: true, reason: null };
    },
    [buyerProfiles, policies]
  );

  /* ─── submitTransaction ────────────────────────────────────── */
  const submitTransaction = useCallback(async (data) => {
    try {
      const result = await txService.submitTransaction({
        buyer_id:     data.buyerId || data.buyer_id,
        alcohol_type: data.alcoholType || data.alcohol_type,
        quantity:     data.quantity,
      });

      // Optimistic update: add to local transaction list
      const newTxn = {
        id:           result.transaction_id,
        buyer_id:     data.buyerId || data.buyer_id,
        alcohol_type: data.alcoholType || data.alcohol_type,
        quantity:     data.quantity,
        status:       'approved',
        timestamp:    new Date().toISOString(),
        ...result,
      };
      setTransactions((prev) => [newTxn, ...prev]);

      // Refresh buyer quota after approved sale
      const buyerId = data.buyerId || data.buyer_id;
      if (buyerId) {
        try {
          const fresh = await buyerService.getBuyerProfile(buyerId);
          if (fresh) {
            setBuyerProfiles((prev) => ({
              ...prev,
              [buyerId]: normalizeProfile(fresh, buyerId),
            }));
          }
        } catch (_) { /* non-fatal */ }
      }

      return newTxn;
    } catch (err) {
      const reason = err.response?.data?.error || err.message || 'Transaction failed';
      // Return rejected txn shape so UI can display the reason
      return {
        status: 'rejected',
        reason,
        id: `local-${Date.now()}`,
      };
    }
  }, []);

  /* ─── updatePolicies ────────────────────────────────────────── */
  const updatePolicies = useCallback(async (newPolicies) => {
    await policyService.updatePolicy({
      daily_limit:            newPolicies.dailyLimit   || newPolicies.daily_limit,
      weekly_limit:           newPolicies.weeklyLimit  || newPolicies.weekly_limit,
      monthly_limit:          newPolicies.monthlyLimit || newPolicies.monthly_limit,
      time_restriction_start: newPolicies.timeRestrictionStart || newPolicies.time_restriction_start,
      time_restriction_end:   newPolicies.timeRestrictionEnd   || newPolicies.time_restriction_end,
    });
    // Refresh
    const fresh = await policyService.getCurrentPolicy();
    setPolicies(normalizePolicy(fresh));
    setAuditLogs((prev) => [{
      id: `local-${Date.now()}`,
      event_type: 'policy_change',
      user_role: 'authority',
      details: 'Policies updated',
      timestamp: new Date().toISOString(),
    }, ...prev]);
  }, []);

  /* ─── toggleEmergency ──────────────────────────────────────── */
  const toggleEmergency = useCallback(async () => {
    const newFlag = !policies?.emergencyFlag;
    await policyService.toggleEmergency(newFlag);
    setPolicies((prev) => ({ ...prev, emergencyFlag: newFlag }));
    // Emit socket event is handled server-side; UI updates via socket hook
    return newFlag;
  }, [policies]);

  /* ─── toggleBlacklist ──────────────────────────────────────── */
  const toggleBlacklist = useCallback(async (buyerId) => {
    await buyerService.toggleBlacklist(buyerId);
    // Refresh buyer profile
    try {
      const fresh = await buyerService.getBuyerProfile(buyerId);
      setBuyerProfiles((prev) => ({
        ...prev,
        [buyerId]: normalizeProfile(fresh, buyerId),
      }));
    } catch (_) {
      // Optimistic toggle fallback
      setBuyerProfiles((prev) => ({
        ...prev,
        [buyerId]: {
          ...prev[buyerId],
          blacklistStatus: !prev[buyerId]?.blacklistStatus,
        },
      }));
    }
  }, []);

  /* ─── Helpers for components ────────────────────────────────── */
  const getBuyerTransactions = useCallback(
    (buyerId) => transactions.filter(
      (t) => String(t.buyer_id || t.buyerId) === String(buyerId)
    ),
    [transactions]
  );

  const getShopTransactions = useCallback(
    (shopId) => transactions.filter(
      (t) => String(t.shop_id || t.shopId) === String(shopId)
    ),
    [transactions]
  );

  const value = {
    transactions,
    buyerProfiles,
    policies,
    auditLogs,
    analytics,
    loading,
    error,
    submitTransaction,
    validateTransaction,
    updatePolicies,
    toggleEmergency,
    toggleBlacklist,
    getBuyerTransactions,
    getShopTransactions,
    refreshData: loadData,
    // Expose setters for socket hook to update live
    setTransactions,
    setPolicies,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
