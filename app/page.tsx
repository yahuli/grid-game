'use client';

import React, { useEffect, useState } from 'react';
import Game from '../components/Game';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
    const [playerUuid, setPlayerUuid] = useState<string>('');
    const [history, setHistory] = useState<any[]>([]);
    const [activeGames, setActiveGames] = useState<any[]>([]);
    const [selectedGameId, setSelectedGameId] = useState<string | undefined>(undefined);

    useEffect(() => {
        const initPlayer = async () => {
            let uuid = localStorage.getItem('player_uuid');
            if (!uuid) {
                uuid = uuidv4();
                localStorage.setItem('player_uuid', uuid);
            }
            setPlayerUuid(uuid);

            // Login/Register
            await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid })
            });

            // Fetch History
            const res = await fetch(`/api/game/history?uuid=${uuid}`);
            const data = await res.json();
            if (data.games) {
                const active = data.games.filter((g: any) => g.state !== 'GAMEOVER');
                const finished = data.games.filter((g: any) => g.state === 'GAMEOVER');
                setActiveGames(active);
                setHistory(finished);
            }
        };

        initPlayer();
    }, []);

    return (
        <main style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '20px' }}>
            <div style={{ margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>游戏中心</h1>
                    <div style={{ fontSize: '14px', color: '#94a3b8' }}>Player ID: {playerUuid.slice(0, 8)}...</div>
                </div>

                {activeGames.length > 0 && !selectedGameId && (
                    <div style={{ marginBottom: '30px', padding: '15px', background: '#1e293b', borderRadius: '8px', border: '1px solid #3b82f6' }}>
                        <h2 style={{ fontSize: '18px', marginBottom: '10px', color: '#60a5fa' }}>正在进行中的游戏</h2>
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                            {activeGames.map((game) => (
                                <div key={game.id} style={{ minWidth: '200px', padding: '10px', background: '#334155', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{new Date(game.created_at).toLocaleDateString()}</div>
                                    <div style={{ fontWeight: 'bold', color: '#fbbf24' }}>
                                        {game.state}
                                    </div>
                                    <div style={{ fontSize: '12px' }}>房间号: {game.room_id}</div>
                                    <button
                                        onClick={() => setSelectedGameId(game.room_id)}
                                        style={{ marginTop: '8px', width: '100%', padding: '6px', background: '#3b82f6', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                                    >
                                        继续
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {history.length > 0 && !selectedGameId && (
                    <div style={{ marginBottom: '30px', padding: '15px', background: '#1e293b', borderRadius: '8px' }}>
                        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>正在进行中的游戏</h2>
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                            {history.map((game) => (
                                <div key={game.id} style={{ minWidth: '200px', padding: '10px', background: '#334155', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{new Date(game.created_at).toLocaleDateString()}</div>
                                    <div style={{ fontWeight: 'bold', color: game.winner === playerUuid ? '#4ade80' : '#f87171' }}>
                                        {game.winner === playerUuid ? 'VICTORY' : 'DEFEAT'}
                                    </div>
                                    <div style={{ fontSize: '12px' }}>房间号: {game.room_id}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Game playerUuid={playerUuid} initialGameId={selectedGameId} />
            </div>
        </main>
    );
}
