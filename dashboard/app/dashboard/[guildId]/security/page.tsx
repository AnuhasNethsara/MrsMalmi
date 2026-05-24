'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageTransition } from '@/components/PageTransition';

interface SecuritySettings {
  antiRaid: {
    enabled: boolean;
    joinThreshold: number;
    joinWindow: number;
    action: string;
  };
  verification: {
    enabled: boolean;
    type: string;
    timeout: number;
  };
  autoMod: {
    spamFilter: boolean;
    wordFilter: boolean;
    linkFilter: boolean;
    capsFilter: boolean;
    mentionFilter: boolean;
    duplicateFilter: boolean;
  };
}

export default function SecuritySettingsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SecuritySettings>({
    antiRaid: {
      enabled: true,
      joinThreshold: 10,
      joinWindow: 10,
      action: 'kick',
    },
    verification: {
      enabled: false,
      type: 'button',
      timeout: 300,
    },
    autoMod: {
      spamFilter: true,
      wordFilter: true,
      linkFilter: true,
      capsFilter: false,
      mentionFilter: true,
      duplicateFilter: false,
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${apiUrl}/api/guilds/${guildId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ security: settings }),
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (val: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-300">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-discord-blurple' : 'bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <PageTransition>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Security Settings</h1>
            <p className="text-gray-400 mt-1">Configure anti-raid, verification, and auto-moderation</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Anti-Raid */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">🛡️ Anti-Raid</h2>
          <Toggle
            label="Enable Anti-Raid Protection"
            checked={settings.antiRaid.enabled}
            onChange={(val) =>
              setSettings({ ...settings, antiRaid: { ...settings.antiRaid, enabled: val } })
            }
          />
          {settings.antiRaid.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Join Threshold</label>
                <input
                  type="number"
                  value={settings.antiRaid.joinThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      antiRaid: { ...settings.antiRaid, joinThreshold: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Window (seconds)</label>
                <input
                  type="number"
                  value={settings.antiRaid.joinWindow}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      antiRaid: { ...settings.antiRaid, joinWindow: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Action</label>
                <select
                  value={settings.antiRaid.action}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      antiRaid: { ...settings.antiRaid, action: e.target.value },
                    })
                  }
                  className="input-field w-full"
                >
                  <option value="kick">Kick</option>
                  <option value="ban">Ban</option>
                  <option value="lockdown">Lockdown</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Verification */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">✅ Verification</h2>
          <Toggle
            label="Enable Verification System"
            checked={settings.verification.enabled}
            onChange={(val) =>
              setSettings({ ...settings, verification: { ...settings.verification, enabled: val } })
            }
          />
          {settings.verification.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Verification Type</label>
                <select
                  value={settings.verification.type}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      verification: { ...settings.verification, type: e.target.value },
                    })
                  }
                  className="input-field w-full"
                >
                  <option value="button">Button Click</option>
                  <option value="captcha">CAPTCHA</option>
                  <option value="timer">Timer</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Timeout (seconds)</label>
                <input
                  type="number"
                  value={settings.verification.timeout}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      verification: { ...settings.verification, timeout: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="input-field w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Auto-Mod */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">🤖 Auto-Moderation Filters</h2>
          <Toggle
            label="Spam Filter"
            checked={settings.autoMod.spamFilter}
            onChange={(val) =>
              setSettings({ ...settings, autoMod: { ...settings.autoMod, spamFilter: val } })
            }
          />
          <Toggle
            label="Word Filter"
            checked={settings.autoMod.wordFilter}
            onChange={(val) =>
              setSettings({ ...settings, autoMod: { ...settings.autoMod, wordFilter: val } })
            }
          />
          <Toggle
            label="Link Filter"
            checked={settings.autoMod.linkFilter}
            onChange={(val) =>
              setSettings({ ...settings, autoMod: { ...settings.autoMod, linkFilter: val } })
            }
          />
          <Toggle
            label="Caps Filter"
            checked={settings.autoMod.capsFilter}
            onChange={(val) =>
              setSettings({ ...settings, autoMod: { ...settings.autoMod, capsFilter: val } })
            }
          />
          <Toggle
            label="Mention Filter"
            checked={settings.autoMod.mentionFilter}
            onChange={(val) =>
              setSettings({ ...settings, autoMod: { ...settings.autoMod, mentionFilter: val } })
            }
          />
          <Toggle
            label="Duplicate Filter"
            checked={settings.autoMod.duplicateFilter}
            onChange={(val) =>
              setSettings({ ...settings, autoMod: { ...settings.autoMod, duplicateFilter: val } })
            }
          />
        </div>
      </div>
    </PageTransition>
  );
}
