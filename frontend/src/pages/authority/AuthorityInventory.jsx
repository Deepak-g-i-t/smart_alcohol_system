// Authority Inventory Overview (Priority 2.6)
import { useState, useMemo } from 'react';
import { Package, AlertTriangle, TrendingDown, Search } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import StatusBadge from '../../components/StatusBadge';

// Demo inventory data for when running in demo mode
const DEMO_INVENTORY = [
  { id: 1, shop_id: 'shop-001', shop_name: 'State Liquor Store #142', alcohol_type: 'Whiskey', stock_qty: 45, low_threshold: 10 },
  { id: 2, shop_id: 'shop-001', shop_name: 'State Liquor Store #142', alcohol_type: 'Beer', stock_qty: 8, low_threshold: 20 },
  { id: 3, shop_id: 'shop-001', shop_name: 'State Liquor Store #142', alcohol_type: 'Rum', stock_qty: 30, low_threshold: 10 },
  { id: 4, shop_id: 'shop-002', shop_name: 'State Liquor Store #287', alcohol_type: 'Whiskey', stock_qty: 5, low_threshold: 10 },
  { id: 5, shop_id: 'shop-002', shop_name: 'State Liquor Store #287', alcohol_type: 'Vodka', stock_qty: 52, low_threshold: 15 },
  { id: 6, shop_id: 'shop-002', shop_name: 'State Liquor Store #287', alcohol_type: 'Wine', stock_qty: 0, low_threshold: 5 },
];

export default function AuthorityInventory() {
  const [search, setSearch] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);

  const inventory = DEMO_INVENTORY; // In production, fetch from /api/inventory

  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      if (showLowOnly && item.stock_qty > item.low_threshold) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          item.shop_name.toLowerCase().includes(s) ||
          item.alcohol_type.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [inventory, search, showLowOnly]);

  const lowStockCount = inventory.filter((i) => i.stock_qty <= i.low_threshold).length;
  const outOfStockCount = inventory.filter((i) => i.stock_qty === 0).length;

  const getStockColor = (qty, threshold) => {
    if (qty === 0) return 'text-accent-red';
    if (qty <= threshold) return 'text-accent-amber';
    return 'text-accent-green';
  };

  const getStockBg = (qty, threshold) => {
    if (qty === 0) return 'bg-accent-red/10';
    if (qty <= threshold) return 'bg-accent-amber/10';
    return 'bg-accent-green/10';
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Inventory Overview</h1>
          <p className="text-sm text-dark-400 mt-1">Aggregate stock levels across all shops</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-accent-cyan p-1.5 bg-accent-cyan/10 rounded-lg" />
            <div>
              <p className="text-xs text-dark-400">Total SKUs</p>
              <p className="text-2xl font-bold text-dark-100">{inventory.length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-accent-amber p-1.5 bg-accent-amber/10 rounded-lg" />
            <div>
              <p className="text-xs text-dark-400">Low Stock</p>
              <p className="text-2xl font-bold text-accent-amber">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-accent-red p-1.5 bg-accent-red/10 rounded-lg" />
            <div>
              <p className="text-xs text-dark-400">Out of Stock</p>
              <p className="text-2xl font-bold text-accent-red">{outOfStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search by shop or alcohol type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <button
          onClick={() => setShowLowOnly((p) => !p)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
            showLowOnly
              ? 'bg-accent-amber/20 border-accent-amber/40 text-accent-amber'
              : 'bg-dark-700 border-dark-600 text-dark-300 hover:border-accent-amber/40'
          }`}
        >
          {showLowOnly ? '⚠ Low Stock Only' : 'Show Low Stock'}
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                {['Shop', 'Alcohol Type', 'Stock Qty', 'Low Threshold', 'Status'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="table-row">
                  <td className="px-5 py-3 text-sm text-dark-200">{item.shop_name}</td>
                  <td className="px-5 py-3 text-sm text-dark-300">{item.alcohol_type}</td>
                  <td className="px-5 py-3">
                    <span className={`text-lg font-bold ${getStockColor(item.stock_qty, item.low_threshold)}`}>
                      {item.stock_qty}
                    </span>
                    <span className="text-xs text-dark-500 ml-1">units</span>
                  </td>
                  <td className="px-5 py-3 text-sm text-dark-400">{item.low_threshold}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStockBg(item.stock_qty, item.low_threshold)} ${getStockColor(item.stock_qty, item.low_threshold)}`}>
                      {item.stock_qty === 0 ? 'Out of Stock' : item.stock_qty <= item.low_threshold ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-dark-500">No inventory items found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
