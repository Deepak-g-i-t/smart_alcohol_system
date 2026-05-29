import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock } from 'lucide-react';

export default function BuyerDashboard({ user }) {
    const [history, setHistory] = useState([]);

    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';

    useEffect(() => {
        axios.get(`${apiBase}/transactions/history/${user.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(res => setHistory(res.data)).catch(console.error);
    }, [user.id]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-xl shadow-indigo-200">
                <h1 className="text-3xl font-extrabold">Welcome back, {user.name}</h1>
                <p className="mt-2 text-indigo-100 text-lg">Your Buyer ID is: <span className="font-mono bg-indigo-800 px-2 py-1 rounded">{user.id}</span></p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="text-indigo-500" /> Recent Purchase History
                </h2>
                <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left font-semibold text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left font-semibold text-gray-500 uppercase">Item</th>
                                <th className="px-6 py-3 text-left font-semibold text-gray-500 uppercase">Qty</th>
                                <th className="px-6 py-3 text-left font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left font-semibold text-gray-500 uppercase">Note</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {history.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{new Date(tx.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{tx.alcohol_type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{tx.quantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {tx.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{tx.reason || '-'}</td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No purchases found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
