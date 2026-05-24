'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageTransition } from '@/components/PageTransition';

interface Ticket {
  ticketId: string;
  userId: string;
  username: string;
  category: string;
  status: string;
  createdAt: string;
  closedAt?: string;
}

export default function TicketsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchTickets() {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/guilds/${guildId}/tickets`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setTickets(data.tickets || []);
        }
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, [guildId]);

  const filteredTickets = statusFilter === 'all'
    ? tickets
    : tickets.filter((t) => t.status === statusFilter);

  const handleDownloadTranscript = async (ticketId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/guilds/${guildId}/tickets/${ticketId}/transcript`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript-${ticketId}.html`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download transcript:', err);
    }
  };

  const statusColors: Record<string, string> = {
    open: 'text-discord-green bg-discord-green/10',
    claimed: 'text-discord-blurple bg-discord-blurple/10',
    closed: 'text-gray-400 bg-gray-400/10',
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Tickets</h1>
          <p className="text-gray-400 mt-1">Manage support tickets and view transcripts</p>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2">
          {['all', 'open', 'claimed', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-discord-blurple text-white'
                  : 'bg-discord-dark text-gray-300 hover:bg-gray-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        <div className="space-y-3">
          {loading ? (
            <div className="card text-center text-gray-400 py-8">Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="card text-center text-gray-400 py-8">No tickets found</div>
          ) : (
            filteredTickets.map((ticket) => (
              <div key={ticket.ticketId} className="card flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-white font-medium">#{ticket.ticketId}</p>
                    <p className="text-sm text-gray-400">{ticket.username}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${statusColors[ticket.status] || ''}`}>
                    {ticket.status}
                  </span>
                  {ticket.category && (
                    <span className="text-xs text-gray-500 bg-discord-darker px-2 py-1 rounded">
                      {ticket.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                  {ticket.status === 'closed' && (
                    <button
                      onClick={() => handleDownloadTranscript(ticket.ticketId)}
                      className="btn-secondary text-sm py-1 px-3"
                    >
                      📄 Transcript
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  );
}
