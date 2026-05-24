'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageTransition } from '@/components/PageTransition';

interface GuildStats {
  memberCount: number;
  botUptime: number;
  activeTickets: number;
  recentActions: number;
}

export default function DashboardHomePage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [stats, setStats] = useState<GuildStats>({
    memberCount: 0,
    botUptime: 0,
    activeTickets: 0,
    recentActions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/guilds/${guildId}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [guildId]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  const statCards = [
    { label: 'Members', value: stats.memberCount.toLocaleString(), icon: '👥', color: 'text-discord-blurple' },
    { label: 'Bot Uptime', value: formatUptime(stats.botUptime), icon: '⏱️', color: 'text-discord-green' },
    { label: 'Active Tickets', value: stats.activeTickets.toString(), icon: '🎫', color: 'text-discord-yellow' },
    { label: 'Recent Actions', value: stats.recentActions.toString(), icon: '⚖️', color: 'text-discord-fuchsia' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-discord-blurple border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Server Overview</h1>
          <p className="text-gray-400 mt-1">Quick glance at your server stats</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="card">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Moderation Actions</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
              <span className="text-gray-300">No recent actions</span>
              <span className="text-xs text-gray-500">—</span>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
