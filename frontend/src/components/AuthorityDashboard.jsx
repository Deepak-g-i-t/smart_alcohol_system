import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, AlertOctagon } from 'lucide-react';

export default function AuthorityDashboard() {
    const [summary, setSummary] = useState({ sales_today: 0, rejected_today: 0, high_risk_users: 0 });
    const [riskUsers, setRiskUsers] = useState([]);
    const [rejects, setRejects] = useState([]);

    const [policy, setPolicy] = useState({ emergency_flag: false });

    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    const fetchData = async () => {
        try {
            const [sumRes, riskRes, rejectRes, polRes] = await Promise.all([
                axios.get(`${apiBase}/analytics/summary`, getHeaders()),
                axios.get(`${apiBase}/analytics/high-risk-buyers`, getHeaders()),
                axios.get(`${apiBase}/analytics/rejected-transactions`, getHeaders()),
                axios.get(`${apiBase}/policies/current`, getHeaders())
            ]);
            setSummary(sumRes.data);
            setRiskUsers(riskRes.data);
            setRejects(rejectRes.data);
            if (polRes.data) setPolicy(polRes.data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const toggleEmergency = async () => {
        try {
            await axios.post(`${apiBase}/policies/emergency-toggle`, { emergency_flag: !policy.emergency_flag }, getHeaders());
            fetchData();
        } catch (e) { console.error(e) }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Sales Today</h3>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{summary.sales_today}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-full text-green-600"><CheckCircle2 size={24} /></div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Rejected Txs</h3>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{summary.rejected_today}</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-full text-orange-600"><AlertCircle size={24} /></div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">High Risk Users</h3>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{summary.high_risk_users}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-full text-red-600"><AlertOctagon size={24} /></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Control Panel */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Emergency Control</h2>
                    <div className={`p-6 rounded-lg border-2 flex items-center justify-between transition-colors ${policy.emergency_flag ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <div>
                            <h4 className={`font-bold text-lg ${policy.emergency_flag ? 'text-red-700' : 'text-green-700'}`}>
                                {policy.emergency_flag ? 'SYSTEM LOCKED' : 'SYSTEM OPERATIONAL'}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">Locks all generic alcohol sales across POS immediately.</p>
                        </div>
                        <button onClick={toggleEmergency} className={`px-6 py-3 rounded-lg font-bold shadow transition-transform active:scale-95 text-white ${policy.emergency_flag ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                            {policy.emergency_flag ? 'RESTORE OPERATIONS' : 'ENABLE LOCKDOWN'}
                        </button>
                    </div>
                </div>

                {/* High Risk Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">High Risk Buyers</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-gray-500 font-semibold tracking-wider uppercase text-xs">Buyer ID</th>
                                    <th className="px-4 py-3 text-gray-500 font-semibold tracking-wider uppercase text-xs">Name</th>
                                    <th className="px-4 py-3 text-gray-500 font-semibold tracking-wider uppercase text-xs">Risk Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {riskUsers.map(u => (
                                    <tr key={u.buyer_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">{u.buyer_id}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">{u.risk_score}</span>
                                        </td>
                                    </tr>
                                ))}
                                {riskUsers.length === 0 && <tr><td colSpan="3" className="px-4 py-3 text-center text-gray-500">No high risk users detected.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
