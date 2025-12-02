import React, { useState } from 'react';
import { useRouter } from 'next/router';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('admin_token', data.token);
                router.push('/admin/dashboard');
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Login failed');
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleLogin} className="login-form">
                <h1>Admin Login</h1>
                {error && <p className="error">{error}</p>}
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <button type="submit">Login</button>
            </form>
            <style jsx>{`
                .login-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    background: #121212;
                    color: white;
                }
                .login-form {
                    background: #1e1e1e;
                    padding: 2rem;
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    width: 300px;
                }
                input {
                    padding: 0.5rem;
                    border-radius: 4px;
                    border: 1px solid #333;
                    background: #2c2c2c;
                    color: white;
                }
                button {
                    padding: 0.5rem;
                    background: #bb86fc;
                    color: black;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                }
                .error {
                    color: #cf6679;
                    font-size: 0.9rem;
                }
            `}</style>
        </div>
    );
};

export default AdminLogin;
