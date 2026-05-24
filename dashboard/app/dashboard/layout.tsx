'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navLinks = [
  { href: '', label: 'Home', icon: '🏠' },
  { href: '/security', label: 'Security', icon: '🛡️' },
  { href: '/moderation', label: 'Moderation', icon: '⚖️' },
  { href: '/tickets', label: 'Tickets', icon: '🎫' },
  { href: '/analytics', label: 'Analytics', icon: '📊' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [guilds] = useState([
    { id: '123456789', name: 'My Server' },
    { id: '987654321', name: 'Test Server' },
  ]);

  const guildId = pathname.split('/')[2] || selectedGuild || guilds[0]?.id;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-discord-dark border-r border-gray-700/50 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-700/50">
          <h1 className="text-xl font-bold text-white">Mrs Malmi</h1>
          <p className="text-xs text-gray-400 mt-1">Dashboard</p>
        </div>

        {/* Guild Selector */}
        <div className="p-4 border-b border-gray-700/50">
          <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
            Server
          </label>
          <select
            value={selectedGuild || guildId}
            onChange={(e) => setSelectedGuild(e.target.value)}
            className="w-full input-field text-sm"
          >
            {guilds.map((guild) => (
              <option key={guild.id} value={guild.id}>
                {guild.name}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map((link) => {
            const fullHref = `/dashboard/${guildId}${link.href}`;
            const isActive = pathname === fullHref;

            return (
              <Link
                key={link.label}
                href={fullHref}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-discord-blurple text-white'
                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700/50">
          <button className="btn-secondary w-full text-sm">Logout</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
