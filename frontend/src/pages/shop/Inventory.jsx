// Shop Inventory Management (Priority 2.6)
import { useState, useMemo } from 'react';
import { Package, Plus, AlertTriangle, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ALCOHOL_TYPES = ['Whiskey', 'Beer', 'Rum', 'Vodka', 'Wine', 'Brandy', 'Gin'];

const INITIAL_INVENTORY = [
  { id: 1, alcohol_type: 'Whiskey', stock_qty: 45, low_threshold: 10 },
  { id: 2, alcohol_type: 'Beer',    stock_qty: 8,  low_threshold: 20 },
  { id: 3, alcohol_type: 'Rum',     stock_qty: 30, low_threshold: 10 },
  { id: 4, alcohol_type: 'Vodka',   stock_qty: 12, low_threshold: 15 },
  { id: 5, alcohol_type: 'Wine',    stock_qty: 0,  low_threshold: 5  },
];

export default function ShopInventory() {
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [editing, setEditing] = useState(null); // { id, stock_qty, low_threshold }
  const [addForm, setAddForm] = useState({ alcohol_type: 'Gin', stock_qty: 20, low_threshold: 10 });
  const [showAdd, setShowAdd] = useState(false);

  const lowStock = useMemo(() => inventory.filter((i) => i.stock_qty <= i.low_threshold), [inventory]);

  const startEdit = (item) => setEditing({ ...item });
  const cancelEdit = () => setEditing(null);

  const saveEdit = () => {
    setInventory((prev) =>
      prev.map((i) => (i.id === editing.id ? { ...i, stock_qty: editing.stock_qty, low_threshold: editing.low_threshold } : i))
    );
    toast.success('Stock updated');
    setEditing(null);
  };

  const addItem = () => {
    const exists = inventory.find((i) => i.alcohol_type === addForm.alcohol_type);
    if (exists) {
      toast.error(`${addForm.alcohol_type} already tracked — edit its stock instead`);
      return;
    }
    setInventory((prev) => [
      ...prev,
      { id: Date.now(), ...addForm },
    ]);
    toast.success(`${addForm.alcohol_type} added to inventory`);
    setShowAdd(false);
  };

  const getStatus = (qty, threshold) => {
    if (qty === 0) return { label: 'Out of Stock', color: 'text-accent-red', bg: 'bg-accent-red/10' };
    if (qty <= threshold) return { label: 'Low Stock', color: 'text-accent-amber', bg: 'bg-accent-amber/10' };
    return { label: 'In Stock', color: 'text-accent-green', bg: 'bg-accent-green/10' };
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">My Inventory</h1>
          <p className="text-sm text-dark-400 mt-1">Manage stock levels for your store</p>
        </div>
        <button onClick={() => setShowAdd((p) => !p)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Add Stock Type
        </button>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="glass-card p-4 border border-accent-amber/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-accent-amber" />
            <span className="text-sm font-semibold text-accent-amber">Low Stock Alerts</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((i) => (
              <span key={i.id} className="text-xs px-2.5 py-1 bg-accent-amber/10 text-accent-amber rounded-full border border-accent-amber/20">
                {i.alcohol_type}: {i.stock_qty} units
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="glass-card p-5 border border-accent-cyan/20 space-y-4">
          <h3 className="text-sm font-semibold text-dark-100">Add New Stock Entry</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Alcohol Type</label>
              <select
                value={addForm.alcohol_type}
                onChange={(e) => setAddForm((p) => ({ ...p, alcohol_type: e.target.value }))}
                className="select-field"
              >
                {ALCOHOL_TYPES.filter((t) => !inventory.find((i) => i.alcohol_type === t)).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Stock Qty</label>
              <input
                type="number"
                min={0}
                value={addForm.stock_qty}
                onChange={(e) => setAddForm((p) => ({ ...p, stock_qty: parseInt(e.target.value) || 0 }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Low Threshold</label>
              <input
                type="number"
                min={1}
                value={addForm.low_threshold}
                onChange={(e) => setAddForm((p) => ({ ...p, low_threshold: parseInt(e.target.value) || 5 }))}
                className="input-field"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={addItem} className="btn-primary text-sm">Add</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                {['Alcohol Type', 'Stock Qty', 'Low Threshold', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const s = getStatus(item.stock_qty, item.low_threshold);
                const isEditing = editing?.id === item.id;
                return (
                  <tr key={item.id} className="table-row">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-dark-400" />
                        <span className="text-sm text-dark-200 font-medium">{item.alcohol_type}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={editing.stock_qty}
                          onChange={(e) => setEditing((p) => ({ ...p, stock_qty: parseInt(e.target.value) || 0 }))}
                          className="input-field w-20 text-sm py-1"
                        />
                      ) : (
                        <span className={`text-lg font-bold ${s.color}`}>{item.stock_qty}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          min={1}
                          value={editing.low_threshold}
                          onChange={(e) => setEditing((p) => ({ ...p, low_threshold: parseInt(e.target.value) || 1 }))}
                          className="input-field w-20 text-sm py-1"
                        />
                      ) : (
                        <span className="text-sm text-dark-400">{item.low_threshold}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.color}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="p-1.5 text-accent-green hover:bg-accent-green/10 rounded">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={cancelEdit} className="p-1.5 text-dark-400 hover:bg-dark-700/60 rounded">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1.5 text-dark-400 hover:text-accent-cyan hover:bg-dark-700/60 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
