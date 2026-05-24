'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageTransition } from '@/components/PageTransition';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface JoinData {
  date: string;
  joins: number;
  leaves: number;
}

interface ModerationData {
  type: string;
  count: number;
}

export default function AnalyticsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [joinData, setJoinData] = useState<JoinData[]>([]);
  const [modData, setModData] = useState<ModerationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/guilds/${guildId}/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setJoinData(data.joins || []);
          setModData(data.moderation || []);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [guildId]);

  // Placeholder data for demonstration
  const placeholderJoinData: JoinData[] = [
    { date: 'Mon', joins: 12, leaves: 3 },
    { date: 'Tue', joins: 8, leaves: 5 },
    { date: 'Wed', joins: 15, leaves: 2 },
    { date: 'Thu', joins: 6, leaves: 4 },
    { date: 'Fri', joins: 20, leaves: 7 },
    { date: 'Sat', joins: 25, leaves: 3 },
    { date: 'Sun', joins: 18, leaves: 6 },
  ];

  const placeholderModData: ModerationData[] = [
    { type: 'Warns', count: 24 },
    { type: 'Mutes', count: 12 },
    { type: 'Kicks', count: 5 },
    { type: 'Bans', count: 3 },
  ];

  const displayJoinData = joinData.length > 0 ? joinData : placeholderJoinData;
  const displayModData = modData.length > 0 ? modData : placeholderModData;

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
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">Server activity and moderation statistics</p>
        </div>

        {/* Joins/Leaves Line Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Member Joins & Leaves (7 days)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayJoinData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E2124',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="joins"
                  stroke="#57F287"
                  strokeWidth={2}
                  dot={{ fill: '#57F287' }}
                />
                <Line
                  type="monotone"
                  dataKey="leaves"
                  stroke="#ED4245"
                  strokeWidth={2}
                  dot={{ fill: '#ED4245' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Moderation Bar Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Moderation Actions (30 days)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayModData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="type" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E2124',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#5865F2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
