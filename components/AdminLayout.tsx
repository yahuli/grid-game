import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            router.push('/admin/login');
        } else {
            setAuthorized(true);
        }
    }, [router]);

    const logout = () => {
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
    };

    if (!authorized) return null;

    return (
        <div className="admin-container">
            <nav className="admin-nav">
                <h1>Grid Game Admin</h1>
                <button onClick={logout} className="btn-logout">Logout</button>
            </nav>
            <main className="admin-content">
                {children}
            </main>
            <style jsx global>{`
                .admin-container {
                    min-height: 100vh;
                    background: #121212;
                    color: white;
                }
                .admin-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 2rem;
                    background: #1e1e1e;
                    border-bottom: 1px solid #333;
                }
                .admin-content {
                    padding: 2rem;
                }
                .btn-logout {
                    background: #cf6679;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};

export default AdminLayout;
