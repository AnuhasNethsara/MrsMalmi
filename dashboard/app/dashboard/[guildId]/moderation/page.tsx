'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageTransition } from '@/components/PageTransition';

interface PunishmentCase {
  caseId: number;
  type: string;
  userId: string;
  username: string;
  moderator: string;
  reason: string;
  createdAt: string;
  active: boolean;
}

export default function ModerationPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [cases, setCases] = useState<PunishmentCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<PunishmentCase | null>(null);

  useEffect(() => {
    async function fetchCases() {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/guilds/${guildId}/cases`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setCases(data.cases || []);
        }
      } catch (err) {
        console.error('Failed to fetch cases:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCases();
  }, [guildId]);

  const filteredCases = filter === 'all'
    ? cases
    : cases.filter((c) => c.type === filter);

  const typeColors: Record<string, string> = {
    ban: 'text-discord-red bg-discord-red/10',
    kick: 'text-orange-400 bg-orange-400/10',
    mute: 'text-discord-yellow bg-discord-yellow/10',
    warn: 'text-discord-blurple bg-discord-blurple/10',
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Moderation</h1>
          <p className="text-gray-400 mt-1">View and manage punishment cases</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'ban', 'kick', 'mute', 'warn'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                filter === type
                  ? 'bg-discord-blurple text-white'
                  : 'bg-discord-dark text-gray-300 hover:bg-gray-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Cases Table */}
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-discord-darker">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase">Case</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase">Moderator</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase">Reason</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Loading cases...
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No cases found
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr
                    key={c.caseId}
                    onClick={() => setSelectedCase(c)}
                    className="hover:bg-gray-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-mono">#{c.caseId}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${typeColors[c.type] || 'text-gray-300'}`}>
                        {c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{c.username}</td>
                    <td className="px-4 py-3 text-gray-300">{c.moderator}</td>
                    <td className="px-4 py-3 text-gray-400 truncate max-w-[200px]">{c.reason}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Case Detail Modal */}
        {selectedCase && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="card max-w-lg w-full mx-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Case #{selectedCase.caseId}</h3>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type</span>
                  <span className={`capitalize ${typeColors[selectedCase.type] || ''} px-2 py-0.5 rounded text-sm`}>
                    {selectedCase.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">User</span>
                  <span className="text-white">{selectedCase.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Moderator</span>
                  <span className="text-white">{selectedCase.moderator}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date</span>
                  <span className="text-white">{new Date(selectedCase.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Reason</span>
                  <p className="text-white bg-discord-darker rounded-lg p-3">
                    {selectedCase.reason || 'No reason provided'}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedCase(null)} className="btn-secondary w-full">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
