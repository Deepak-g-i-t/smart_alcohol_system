import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthorityDashboard from './AuthorityDashboard';
import ShopDashboard from './ShopDashboard';
import BuyerDashboard from './BuyerDashboard';
import { LogOut } from 'lucide-react';

export default function Dashboard() {
    const navigate = useNavigate();
    const [role, setRole] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedRole = localStorage.getItem('role');
        const storedUser = localStorage.getItem('user');

        if (!token || !storedRole) {
            navigate('/login');
        } else {
            setRole(storedRole);
            setUser(JSON.parse(storedUser));
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    if (!role) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <nav className="bg-indigo-600 text-white shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-3">
                            <span className="font-bold text-xl tracking-wide">Smart Alcohol POS</span>
                            <span className="bg-indigo-700 text-indigo-100 text-xs px-2 py-1 rounded uppercase tracking-wider font-semibold">
                                {role} Panel
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium">{user?.name}</span>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
                {role === 'authority' && <AuthorityDashboard />}
                {role === 'shop' && <ShopDashboard user={user} />}
                {role === 'buyer' && <BuyerDashboard user={user} />}
            </main>
        </div>
    );
}
