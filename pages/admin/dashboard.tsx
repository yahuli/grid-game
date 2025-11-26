import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

interface Admin {
    id: number;
    username: string;
    created_at: number;
}

interface Player {
    uuid: string;
    last_login: number;
    created_at: number;
}

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState<'admins' | 'players' | 'config' | 'account'>('admins');
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [newAdminUser, setNewAdminUser] = useState('');
    const [newAdminPass, setNewAdminPass] = useState('');
    const [config, setConfig] = useState<any>({});
    const [shapes, setShapes] = useState<number[][][]>([]);
    const [message, setMessage] = useState('');
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');

    useEffect(() => {
        fetchAdmins();
        fetchPlayers();
        fetchConfig();
    }, []);

    const fetchAdmins = async () => {
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/admin/admins', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            setAdmins(await res.json());
        }
    };

    const fetchPlayers = async () => {
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/admin/players', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            setPlayers(await res.json());
        }
    };

    const fetchConfig = async () => {
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/admin/config', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setConfig(data);
            setShapes(data.default_shapes || []);
        }
    };

    const createAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/admin/admins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ username: newAdminUser, password: newAdminPass })
        });
        if (res.ok) {
            setMessage('Admin created');
            setNewAdminUser('');
            setNewAdminPass('');
            fetchAdmins();
        } else {
            const data = await res.json();
            setMessage(`Error: ${data.message}`);
        }
    };

    const deleteAdmin = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`/api/admin/admins/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            setMessage('Admin deleted');
            fetchAdmins();
        }
    };

    const deletePlayer = async (uuid: string) => {
        if (!confirm('Are you sure?')) return;
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`/api/admin/players/${uuid}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            setMessage('Player deleted');
            fetchPlayers();
        }
    };

    const saveShapes = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ key: 'default_shapes', value: shapes })
            });
            if (res.ok) {
                setMessage('Shapes updated');
                fetchConfig();
            } else {
                setMessage('Failed to update shapes');
            }
        } catch (e) {
            setMessage('Error saving shapes');
        }
    };

    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/admin/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
        });
        const data = await res.json();
        setMessage(data.message);
        if (res.ok) {
            setOldPass('');
            setNewPass('');
        }
    };

    const updateShape = (shapeIndex: number, row: number, col: number) => {
        const newShapes = JSON.parse(JSON.stringify(shapes));
        newShapes[shapeIndex][row][col] = newShapes[shapeIndex][row][col] === 1 ? 0 : 1;
        setShapes(newShapes);
    };

    const addShape = () => {
        // Default 3x3 empty shape
        setShapes([...shapes, [[0, 0, 0], [0, 0, 0], [0, 0, 0]]]);
    };

    const removeShape = (index: number) => {
        console.debug('Removing shape', index);
        const newShapes = shapes.filter((_, i) => i !== index);
        setShapes(newShapes);
    };

    const addRow = (shapeIndex: number) => {
        const newShapes = [...shapes];
        const shape = newShapes[shapeIndex];
        const width = shape[0].length;
        shape.push(new Array(width).fill(0));
        setShapes(newShapes);
    };

    const addCol = (shapeIndex: number) => {
        const newShapes = [...shapes];
        const shape = newShapes[shapeIndex];
        shape.forEach(row => row.push(0));
        setShapes(newShapes);
    };

    return (
        <AdminLayout>
            <div className="dashboard">
                <div className="tabs">
                    <button
                        className={activeTab === 'admins' ? 'active' : ''}
                        onClick={() => setActiveTab('admins')}
                    >
                        Admins
                    </button>
                    <button
                        className={activeTab === 'players' ? 'active' : ''}
                        onClick={() => setActiveTab('players')}
                    >
                        Players
                    </button>
                    <button
                        className={activeTab === 'config' ? 'active' : ''}
                        onClick={() => setActiveTab('config')}
                    >
                        Config (Shapes)
                    </button>
                    <button
                        className={activeTab === 'account' ? 'active' : ''}
                        onClick={() => setActiveTab('account')}
                    >
                        Account
                    </button>
                </div>

                {message && <div className="message">{message}</div>}

                {activeTab === 'admins' && (
                    <div className="tab-content">
                        <h2>Admins</h2>
                        <form onSubmit={createAdmin} className="create-form">
                            <input
                                type="text"
                                placeholder="Username"
                                value={newAdminUser}
                                onChange={e => setNewAdminUser(e.target.value)}
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={newAdminPass}
                                onChange={e => setNewAdminPass(e.target.value)}
                            />
                            <button type="submit">Add Admin</button>
                        </form>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Created At</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map(admin => (
                                    <tr key={admin.id}>
                                        <td>{admin.id}</td>
                                        <td>{admin.username}</td>
                                        <td>{new Date(admin.created_at).toLocaleString()}</td>
                                        <td>
                                            <button onClick={() => deleteAdmin(admin.id)} className="btn-delete">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'players' && (
                    <div className="tab-content">
                        <h2>Players</h2>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>UUID</th>
                                    <th>Last Login</th>
                                    <th>Created At</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.map(player => (
                                    <tr key={player.uuid}>
                                        <td>{player.uuid}</td>
                                        <td>{player.last_login ? new Date(player.last_login).toLocaleString() : 'N/A'}</td>
                                        <td>{player.created_at ? new Date(player.created_at).toLocaleString() : 'N/A'}</td>
                                        <td>
                                            <button onClick={() => deletePlayer(player.uuid)} className="btn-delete">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="tab-content">
                        <h2>Shape Editor</h2>
                        <div className="shapes-grid">
                            {shapes.map((shape, sIndex) => (
                                <div key={sIndex} className="shape-editor">
                                    <div className="shape-controls">
                                        <span>Shape #{sIndex + 1}</span>
                                        <button type="button" onClick={() => removeShape(sIndex)} className="btn-delete-small">x</button>
                                    </div>
                                    <div className="grid-container" style={{ gridTemplateColumns: `repeat(${shape[0].length}, 20px)` }}>
                                        {shape.map((row, rIndex) => (
                                            row.map((cell, cIndex) => (
                                                <div
                                                    key={`${rIndex}-${cIndex}`}
                                                    className={`cell ${cell ? 'active' : ''}`}
                                                    onClick={() => updateShape(sIndex, rIndex, cIndex)}
                                                />
                                            ))
                                        ))}
                                    </div>
                                    <div className="size-controls">
                                        <button onClick={() => addRow(sIndex)}>+Row</button>
                                        <button onClick={() => addCol(sIndex)}>+Col</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={addShape} className="btn-add-shape">+ Add New Shape</button>
                        <hr />
                        <button onClick={saveShapes} className="btn-save">Save All Shapes</button>
                    </div>
                )}

                {activeTab === 'account' && (
                    <div className="tab-content">
                        <h2>Change Password</h2>
                        <form onSubmit={changePassword} className="create-form" style={{ flexDirection: 'column', maxWidth: '300px' }}>
                            <input
                                type="password"
                                placeholder="Old Password"
                                value={oldPass}
                                onChange={e => setOldPass(e.target.value)}
                            />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={newPass}
                                onChange={e => setNewPass(e.target.value)}
                            />
                            <button type="submit">Update Password</button>
                        </form>
                    </div>
                )}
            </div>
            <style jsx>{`
                .dashboard {
                    max-width: 900px;
                    margin: 0 auto;
                }
                .tabs {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    border-bottom: 1px solid #333;
                }
                .tabs button {
                    background: none;
                    border: none;
                    color: #888;
                    padding: 1rem;
                    cursor: pointer;
                    font-size: 1rem;
                }
                .tabs button.active {
                    color: #bb86fc;
                    border-bottom: 2px solid #bb86fc;
                }
                .tab-content {
                    background: #1e1e1e;
                    padding: 2rem;
                    border-radius: 8px;
                }
                .create-form {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                input {
                    padding: 0.5rem;
                    background: #2c2c2c;
                    border: 1px solid #333;
                    color: white;
                    border-radius: 4px;
                }
                button {
                    padding: 0.5rem 1rem;
                    background: #bb86fc;
                    color: black;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .data-table th, .data-table td {
                    text-align: left;
                    padding: 0.5rem;
                    border-bottom: 1px solid #333;
                }
                .btn-delete {
                    background: #cf6679;
                    color: white;
                }
                .btn-delete-small {
                    background: #cf6679;
                    color: white;
                    padding: 0.2rem 0.5rem;
                    font-size: 0.8rem;
                }
                .btn-save {
                    background: #03dac6;
                    margin-top: 1rem;
                    width: 100%;
                }
                .btn-add-shape {
                    background: #3700b3;
                    color: white;
                    margin-top: 1rem;
                }
                .message {
                    padding: 1rem;
                    background: #333;
                    margin-bottom: 1rem;
                    border-radius: 4px;
                }
                .shapes-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 2rem;
                }
                .shape-editor {
                    background: #2c2c2c;
                    padding: 1rem;
                    border-radius: 4px;
                }
                .shape-controls {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                }
                .grid-container {
                    display: grid;
                    gap: 2px;
                    margin-bottom: 0.5rem;
                }
                .cell {
                    width: 20px;
                    height: 20px;
                    background: #444;
                    cursor: pointer;
                }
                .cell.active {
                    background: #03dac6;
                }
                .size-controls {
                    display: flex;
                    gap: 0.5rem;
                }
                .size-controls button {
                    font-size: 0.8rem;
                    padding: 0.2rem 0.5rem;
                    background: #555;
                    color: white;
                }
            `}</style>
        </AdminLayout>
    );
};

export default AdminDashboard;
