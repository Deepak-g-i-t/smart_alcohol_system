import React, { useState } from 'react';
import axios from 'axios';
import { ShoppingCart, ServerCrash, CheckSquare } from 'lucide-react';

export default function ShopDashboard({ user }) {
    const [buyerId, setBuyerId] = useState('');
    const [alcoholType, setAlcoholType] = useState('Whiskey');
    const [quantity, setQuantity] = useState(1);
    const [statusMsg, setStatusMsg] = useState(null);

    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatusMsg(null);
        try {
            const res = await axios.post(`${apiBase}/transactions/submit`, {
                buyer_id: buyerId,
                alcohol_type: alcoholType,
                quantity: parseInt(quantity)
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setStatusMsg({ type: 'success', text: `Approved! Transaction ID: ${res.data.transaction_id}` });
            setBuyerId('');
            setQuantity(1);
        } catch (err) {
            setStatusMsg({ type: 'error', text: err.response?.data?.error || 'Transaction Failed' });
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <ShoppingCart className="text-indigo-600" /> POS Terminal Checkout
                </h2>

                {statusMsg && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 border ${statusMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        {statusMsg.type === 'success' ? <CheckSquare /> : <ServerCrash />}
                        <span className="font-medium text-lg">{statusMsg.text}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Buyer Unique ID</label>
                        <input
                            type="number" required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                            value={buyerId}
                            onChange={e => setBuyerId(e.target.value)}
                            placeholder="Scan ID or enter manually (e.g. 2)"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Alcohol Category</label>
                            <select
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none cursor-pointer"
                                value={alcoholType}
                                onChange={e => setAlcoholType(e.target.value)}
                            >
                                <option>Whiskey</option>
                                <option>Beer</option>
                                <option>Vodka</option>
                                <option>Rum</option>
                                <option>Wine</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity (Units)</label>
                            <input
                                type="number" min="1" required
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98]">
                            AUTHORIZE DISPENSING
                        </button>
                        <p className="text-center text-xs text-gray-500 mt-3 font-medium uppercase tracking-wider">Requires real-time server approval</p>
                    </div>
                </form>
            </div>
        </div>
    );
}
