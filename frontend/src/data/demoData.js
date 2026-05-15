// Demo/Mock data for running without Firebase
// This provides realistic seed data for all collections

export const DEMO_USERS = {
  'admin-001': {
    uid: 'admin-001',
    name: 'Rajesh Kumar',
    email: 'admin@slmrs.gov.in',
    role: 'authority',
    createdAt: new Date('2025-01-15'),
    department: 'Excise Department',
    designation: 'Chief Excise Commissioner',
  },
  'shop-001': {
    uid: 'shop-001',
    name: 'Suresh Patel',
    email: 'shop1@slmrs.gov.in',
    role: 'shop',
    createdAt: new Date('2025-02-01'),
    shopName: 'State Liquor Store #142',
    shopRegion: 'Mumbai Central',
    licenseNo: 'MH-EXC-2025-0142',
  },
  'shop-002': {
    uid: 'shop-002',
    name: 'Anil Sharma',
    email: 'shop2@slmrs.gov.in',
    role: 'shop',
    createdAt: new Date('2025-02-10'),
    shopName: 'State Liquor Store #287',
    shopRegion: 'Pune East',
    licenseNo: 'MH-EXC-2025-0287',
  },
  'buyer-001': {
    uid: 'buyer-001',
    name: 'Amit Singh',
    email: 'buyer1@example.com',
    role: 'buyer',
    createdAt: new Date('2025-03-01'),
    aadhaarLast4: '4521',
  },
  'buyer-002': {
    uid: 'buyer-002',
    name: 'Priya Deshmukh',
    email: 'buyer2@example.com',
    role: 'buyer',
    createdAt: new Date('2025-03-05'),
    aadhaarLast4: '7834',
  },
  'buyer-003': {
    uid: 'buyer-003',
    name: 'Vikram Rao',
    email: 'buyer3@example.com',
    role: 'buyer',
    createdAt: new Date('2025-03-08'),
    aadhaarLast4: '1290',
  },
  'buyer-004': {
    uid: 'buyer-004',
    name: 'Neha Joshi',
    email: 'buyer4@example.com',
    role: 'buyer',
    createdAt: new Date('2025-03-15'),
    aadhaarLast4: '5678',
  },
  'buyer-005': {
    uid: 'buyer-005',
    name: 'Deepak Verma',
    email: 'buyer5@example.com',
    role: 'buyer',
    createdAt: new Date('2025-04-01'),
    aadhaarLast4: '9012',
  },
};

export const DEMO_BUYER_PROFILES = {
  'buyer-001': {
    buyerId: 'buyer-001',
    name: 'Amit Singh',
    dailyRemaining: 1,
    weeklyRemaining: 3,
    monthlyRemaining: 8,
    riskScore: 25,
    blacklistStatus: false,
    totalPurchases: 42,
    lastPurchase: new Date('2026-05-07'),
    region: 'Mumbai Central',
  },
  'buyer-002': {
    buyerId: 'buyer-002',
    name: 'Priya Deshmukh',
    dailyRemaining: 2,
    weeklyRemaining: 5,
    monthlyRemaining: 12,
    riskScore: 5,
    blacklistStatus: false,
    totalPurchases: 18,
    lastPurchase: new Date('2026-05-06'),
    region: 'Pune East',
  },
  'buyer-003': {
    buyerId: 'buyer-003',
    name: 'Vikram Rao',
    dailyRemaining: 0,
    weeklyRemaining: 0,
    monthlyRemaining: 2,
    riskScore: 78,
    blacklistStatus: true,
    totalPurchases: 95,
    lastPurchase: new Date('2026-05-07'),
    region: 'Mumbai South',
  },
  'buyer-004': {
    buyerId: 'buyer-004',
    name: 'Neha Joshi',
    dailyRemaining: 2,
    weeklyRemaining: 6,
    monthlyRemaining: 14,
    riskScore: 10,
    blacklistStatus: false,
    totalPurchases: 8,
    lastPurchase: new Date('2026-05-04'),
    region: 'Thane',
  },
  'buyer-005': {
    buyerId: 'buyer-005',
    name: 'Deepak Verma',
    dailyRemaining: 1,
    weeklyRemaining: 2,
    monthlyRemaining: 5,
    riskScore: 45,
    blacklistStatus: false,
    totalPurchases: 67,
    lastPurchase: new Date('2026-05-07'),
    region: 'Nagpur',
  },
};

export const DEMO_POLICIES = {
  current: {
    dailyLimit: 2,
    weeklyLimit: 7,
    monthlyLimit: 15,
    timeRestrictionStart: '22:00',
    timeRestrictionEnd: '06:00',
    emergencyFlag: false,
    maxAlcoholPercentage: 42.8,
    minAge: 21,
    lastUpdated: new Date('2026-05-01'),
    updatedBy: 'admin-001',
  },
};

const alcoholTypes = ['Whiskey', 'Beer', 'Rum', 'Vodka', 'Wine', 'Brandy', 'Gin'];
const statuses = ['approved', 'rejected'];
const rejectionReasons = [
  'Daily quota exceeded',
  'Weekly quota exceeded',
  'Monthly quota exceeded',
  'Time restriction active',
  'Emergency restriction in effect',
  'Buyer blacklisted',
  'Duplicate transaction detected',
];

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateTransactions() {
  const transactions = [];
  const buyers = ['buyer-001', 'buyer-002', 'buyer-003', 'buyer-004', 'buyer-005'];
  const shops = ['shop-001', 'shop-002'];
  const regions = ['Mumbai Central', 'Pune East', 'Mumbai South', 'Thane', 'Nagpur'];

  for (let i = 0; i < 150; i++) {
    const status = Math.random() > 0.25 ? 'approved' : 'rejected';
    const buyer = buyers[Math.floor(Math.random() * buyers.length)];
    const shop = shops[Math.floor(Math.random() * shops.length)];
    
    transactions.push({
      id: `txn-${String(i + 1).padStart(4, '0')}`,
      buyerId: buyer,
      buyerName: DEMO_USERS[buyer].name,
      shopId: shop,
      shopName: DEMO_USERS[shop].shopName,
      alcoholType: alcoholTypes[Math.floor(Math.random() * alcoholTypes.length)],
      quantity: Math.floor(Math.random() * 3) + 1,
      amount: Math.floor(Math.random() * 2000) + 200,
      status,
      reason: status === 'rejected' ? rejectionReasons[Math.floor(Math.random() * rejectionReasons.length)] : null,
      timestamp: randomDate(new Date('2026-04-01'), new Date('2026-05-08')),
      region: regions[Math.floor(Math.random() * regions.length)],
    });
  }

  return transactions.sort((a, b) => b.timestamp - a.timestamp);
}

export const DEMO_TRANSACTIONS = generateTransactions();

export const DEMO_AUDIT_LOGS = [
  { id: 'log-001', eventType: 'LOGIN', userId: 'admin-001', role: 'authority', details: 'Authority admin logged in', timestamp: new Date('2026-05-08T08:00:00'), ipAddress: '192.168.1.100' },
  { id: 'log-002', eventType: 'POLICY_UPDATE', userId: 'admin-001', role: 'authority', details: 'Daily limit changed from 3 to 2', timestamp: new Date('2026-05-08T08:15:00'), ipAddress: '192.168.1.100' },
  { id: 'log-003', eventType: 'TRANSACTION', userId: 'shop-001', role: 'shop', details: 'Transaction txn-0001 processed for buyer-001', timestamp: new Date('2026-05-08T09:00:00'), ipAddress: '192.168.2.50' },
  { id: 'log-004', eventType: 'BLACKLIST', userId: 'admin-001', role: 'authority', details: 'Buyer buyer-003 blacklisted - risk score exceeded threshold', timestamp: new Date('2026-05-07T14:30:00'), ipAddress: '192.168.1.100' },
  { id: 'log-005', eventType: 'EMERGENCY', userId: 'admin-001', role: 'authority', details: 'Emergency restriction activated', timestamp: new Date('2026-05-06T22:00:00'), ipAddress: '192.168.1.100' },
  { id: 'log-006', eventType: 'LOGIN', userId: 'shop-002', role: 'shop', details: 'Shop operator logged in', timestamp: new Date('2026-05-08T07:30:00'), ipAddress: '192.168.3.25' },
  { id: 'log-007', eventType: 'REJECTION', userId: 'shop-001', role: 'shop', details: 'Transaction rejected - buyer-003 quota exceeded', timestamp: new Date('2026-05-07T16:45:00'), ipAddress: '192.168.2.50' },
  { id: 'log-008', eventType: 'EMERGENCY', userId: 'admin-001', role: 'authority', details: 'Emergency restriction deactivated', timestamp: new Date('2026-05-07T06:00:00'), ipAddress: '192.168.1.100' },
];

export const DEMO_ANALYTICS = {
  totalTransactions: DEMO_TRANSACTIONS.length,
  approvedCount: DEMO_TRANSACTIONS.filter(t => t.status === 'approved').length,
  rejectedCount: DEMO_TRANSACTIONS.filter(t => t.status === 'rejected').length,
  totalRevenue: DEMO_TRANSACTIONS.filter(t => t.status === 'approved').reduce((sum, t) => sum + t.amount, 0),
  hotspotAreas: [
    { region: 'Mumbai Central', transactions: 45, violations: 12 },
    { region: 'Pune East', transactions: 38, violations: 8 },
    { region: 'Mumbai South', transactions: 28, violations: 15 },
    { region: 'Thane', transactions: 22, violations: 5 },
    { region: 'Nagpur', transactions: 17, violations: 3 },
  ],
  alcoholDistribution: [
    { type: 'Whiskey', count: 35, percentage: 23.3 },
    { type: 'Beer', count: 30, percentage: 20 },
    { type: 'Rum', count: 25, percentage: 16.7 },
    { type: 'Vodka', count: 22, percentage: 14.7 },
    { type: 'Wine', count: 18, percentage: 12 },
    { type: 'Brandy', count: 12, percentage: 8 },
    { type: 'Gin', count: 8, percentage: 5.3 },
  ],
  dailyTrend: (() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        approved: Math.floor(Math.random() * 15) + 5,
        rejected: Math.floor(Math.random() * 5) + 1,
      });
    }
    return days;
  })(),
  riskDistribution: [
    { range: '0-20', count: 45, label: 'Low Risk' },
    { range: '21-40', count: 28, label: 'Moderate' },
    { range: '41-60', count: 15, label: 'Elevated' },
    { range: '61-80', count: 8, label: 'High Risk' },
    { range: '81-100', count: 4, label: 'Critical' },
  ],
  shopActivity: [
    { shopId: 'shop-001', name: 'Store #142', transactions: 82, approved: 65, rejected: 17 },
    { shopId: 'shop-002', name: 'Store #287', transactions: 68, approved: 55, rejected: 13 },
  ],
  weeklyComparison: [
    { week: 'Week 1', current: 42, previous: 38 },
    { week: 'Week 2', current: 45, previous: 41 },
    { week: 'Week 3', current: 38, previous: 44 },
    { week: 'Week 4', current: 50, previous: 39 },
  ],
};

// Demo credentials for login
export const DEMO_CREDENTIALS = {
  authority: { email: 'admin@slmrs.gov.in', password: 'admin123' },
  shop: { email: 'shop1@slmrs.gov.in', password: 'shop123' },
  buyer: { email: 'buyer1@example.com', password: 'buyer123' },
};
