"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, DownloadCloud, AlertTriangle, Save, Loader2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { exportTopicsCSV, exportTestsCSV, exportMocksCSV, exportFullLogCSV, exportAllCSV } from '@/lib/export/csvExport';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Form states
  const [varcPct, setVarcPct] = useState<string>('');
  const [quantPct, setQuantPct] = useState<string>('');
  const [lrdiPct, setLrdiPct] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // Export states
  const [exportingTopics, setExportingTopics] = useState(false);
  const [exportingTests, setExportingTests] = useState(false);
  const [exportingMocks, setExportingMocks] = useState(false);
  const [exportingFullLog, setExportingFullLog] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }
      
      const { data: dbUser } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      if (dbUser) {
        setUser({ ...dbUser, email: authUser.email });
        setVarcPct(dbUser.varc_percentile?.toString() || '0');
        setQuantPct(dbUser.quant_percentile?.toString() || '0');
        setLrdiPct(dbUser.lrdi_percentile?.toString() || '0');
      }
      setLoading(false);
    }
    loadData();
  }, [router]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    setProfileMessage('');
    try {
      const supabase = createClient();
      await supabase.from('users').update({
        varc_percentile: parseInt(varcPct) || 0,
        quant_percentile: parseInt(quantPct) || 0,
        lrdi_percentile: parseInt(lrdiPct) || 0
      }).eq('id', user.id);
      
      setUser({ ...user, 
        varc_percentile: parseInt(varcPct) || 0,
        quant_percentile: parseInt(quantPct) || 0,
        lrdi_percentile: parseInt(lrdiPct) || 0
      });
      setProfileMessage('Profile saved successfully');
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (e) {
      console.error(e);
      setProfileMessage('Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleResetToDay1 = async () => {
    if (!window.confirm("WARNING: This will delete ALL your topic progress and reset you to Day 1. Are you absolutely sure?")) return;
    if (!window.confirm("DOUBLE CONFIRM: Delete all progress?")) return;
    
    try {
      const supabase = createClient();
      await supabase.from('user_topics').delete().eq('user_id', user.id);
      await supabase.from('users').update({ current_day: 0 }).eq('id', user.id);
      router.push('/onboarding/triage');
    } catch (e) {
      console.error("Failed to reset:", e);
      alert("Failed to reset progress.");
    }
  };

  const handleClearTestAttempts = async () => {
    if (!window.confirm("WARNING: This will delete all your logged test attempts. Mocks and Topic progress will remain. Are you sure?")) return;
    if (!window.confirm("DOUBLE CONFIRM: Delete all test attempts?")) return;
    
    try {
      const supabase = createClient();
      await supabase.from('test_attempts').delete().eq('user_id', user.id);
      alert("All test attempts cleared.");
    } catch (e) {
      console.error("Failed to clear tests:", e);
      alert("Failed to clear test attempts.");
    }
  };

  const handleWipeAllData = async () => {
    if (!window.confirm("WARNING: This will delete ALL your data, including progress, tests, and mocks. This CANNOT be undone. Are you sure?")) return;
    if (!window.confirm("DOUBLE CONFIRM: Delete everything and log out?")) return;
    
    try {
      const supabase = createClient();
      await supabase.from('user_topics').delete().eq('user_id', user.id);
      await supabase.from('test_attempts').delete().eq('user_id', user.id);
      
      const { data: mocks } = await supabase.from('mocks').select('id').eq('user_id', user.id);
      if (mocks && mocks.length > 0) {
        const mockIds = mocks.map((m: any) => m.id);
        await supabase.from('mock_topic_perf').delete().in('mock_id', mockIds);
        await supabase.from('mocks').delete().eq('user_id', user.id);
      }
      
      await supabase.from('users').delete().eq('id', user.id);
      await supabase.auth.signOut();
      
      window.location.href = '/login';
    } catch (e) {
      console.error("Failed to wipe data:", e);
      alert("Failed to wipe data.");
    }
  };

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const triggerExport = async (type: string, exportFn: (id: string) => Promise<void>, setLoader: (val: boolean) => void) => {
    if (!user) return;
    setLoader(true);
    try {
      await exportFn(user.id);
      setExportMessage(`Downloaded ${type}`);
      setTimeout(() => setExportMessage(''), 3000);
    } catch (e) {
      console.error("Export failed:", e);
      setExportMessage(`Failed to export ${type}`);
    } finally {
      setLoader(false);
    }
  };

  const handleExportAll = async () => {
    if (!user) return;
    setExportingAll(true);
    setExportMessage('Downloading 1/4...');
    try {
      await exportTopicsCSV(user.id);
      await new Promise(r => setTimeout(r, 200));
      setExportMessage('Downloading 2/4...');
      await exportTestsCSV(user.id);
      await new Promise(r => setTimeout(r, 200));
      setExportMessage('Downloading 3/4...');
      await exportMocksCSV(user.id);
      await new Promise(r => setTimeout(r, 200));
      setExportMessage('Downloading 4/4...');
      await exportFullLogCSV(user.id);
      setExportMessage('Done ✅');
      setTimeout(() => setExportMessage(''), 3000);
    } catch (e) {
      console.error("Export all failed:", e);
      setExportMessage('Failed during export');
    } finally {
      setExportingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary pb-28 flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const varcNum = parseInt(varcPct) || 0;
  const lrdiNum = parseInt(lrdiPct) || 0;

  return (
    <div className="min-h-screen bg-bg-primary pb-28">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-bg-primary/90 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/5 text-text-secondary transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        
        {/* SECTION 1: Profile */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Profile</h2>
          <Card className="bg-bg-secondary border-white/5">
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1 block">Email</label>
                <div className="bg-bg-tertiary border border-white/5 p-3 rounded-lg text-text-secondary text-sm">
                  {user?.email}
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <label className="text-xs text-text-muted uppercase tracking-wider font-bold block">CAT Percentiles</label>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-text-muted block mb-1">VARC</label>
                    <input type="number" value={varcPct} onChange={(e) => setVarcPct(e.target.value)} 
                           className="w-full bg-bg-tertiary border border-white/10 rounded-lg p-2 text-sm text-text-primary text-center" />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block mb-1">LRDI</label>
                    <input type="number" value={lrdiPct} onChange={(e) => setLrdiPct(e.target.value)} 
                           className="w-full bg-bg-tertiary border border-white/10 rounded-lg p-2 text-sm text-text-primary text-center" />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block mb-1">QUANT</label>
                    <input type="number" value={quantPct} onChange={(e) => setQuantPct(e.target.value)} 
                           className="w-full bg-bg-tertiary border border-white/10 rounded-lg p-2 text-sm text-text-primary text-center" />
                  </div>
                </div>

                <div className="bg-bg-tertiary/50 p-3 rounded-lg text-[11px] text-text-secondary space-y-1.5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${varcNum >= 75 ? 'bg-status-okay' : 'bg-blue-400'}`}></div>
                    <span>VARC: {varcNum >= 75 ? 'Maintenance mode (≥75 percentile)' : 'Standard mode'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${lrdiNum < 40 ? 'bg-status-shaky' : 'bg-orange-400'}`}></div>
                    <span>LRDI: {lrdiNum < 40 ? 'Aggressive mode (<40 percentile)' : 'Standard mode'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    <span>QUANT: Standard mode</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-status-okay">{profileMessage}</span>
                  <button onClick={handleSaveProfile} disabled={isSavingProfile}
                          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Profile
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 2: Engine Settings */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Engine Settings</h2>
          <Card className="bg-bg-secondary border-white/5">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <div>
                  <div className="text-sm text-text-primary font-medium">Catch-up Mode</div>
                  <div className="text-xs text-text-muted">Accelerated R1 schedule</div>
                </div>
                <Badge variant={user?.catchup_mode ? 'default' : 'outline'} className={user?.catchup_mode ? 'bg-blue-500/20 text-blue-400 border-none' : 'text-text-muted'}>
                  {user?.catchup_mode ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <div>
                  <div className="text-sm text-text-primary font-medium">Current Schedule</div>
                  <div className="text-xs text-text-muted">Your engine progression</div>
                </div>
                <div className="text-sm font-bold text-text-primary">
                  Day {user?.current_day || 1} <span className="text-text-muted font-normal">of 150</span>
                </div>
              </div>

              <div className="pt-2">
                <button onClick={handleResetToDay1}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-status-shaky/30 bg-status-shaky/10 text-status-shaky hover:bg-status-shaky/20 transition-colors text-sm font-bold">
                  <AlertTriangle size={16} />
                  Reset to Day 1
                </button>
                <p className="text-[10px] text-text-muted text-center mt-2">Danger: Deletes all topic progress and confidence ratings.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 3: Export Data */}
        <section id="export">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-text-primary">Export Your Data</h2>
            <p className="text-xs text-text-muted">Download your progress as CSV files for backup or analysis</p>
          </div>
          <Card className="bg-bg-secondary border-white/5">
            <CardContent className="p-5 space-y-3">
              
              {[
                { title: 'Topic Progress', desc: '150 topics, all round data', icon: '📊', key: 'topics', state: exportingTopics, setFn: setExportingTopics, exportFn: exportTopicsCSV },
                { title: 'Test Attempts', desc: 'All test scores logged', icon: '🎯', key: 'tests', state: exportingTests, setFn: setExportingTests, exportFn: exportTestsCSV },
                { title: 'Mock Results', desc: 'All mock scores and percentiles', icon: '📝', key: 'mocks', state: exportingMocks, setFn: setExportingMocks, exportFn: exportMocksCSV },
                { title: 'Full Study Log', desc: 'Complete chronological event log', icon: '📋', key: 'log', state: exportingFullLog, setFn: setExportingFullLog, exportFn: exportFullLogCSV }
              ].map((item) => (
                <button key={item.key} onClick={() => triggerExport(item.title, item.exportFn, item.setFn)} disabled={item.state}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-white/5 bg-bg-tertiary/50 hover:bg-white/5 transition-colors text-left group">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-text-primary group-hover:text-white transition-colors">{item.title}</div>
                      <div className="text-[10px] text-text-muted">{item.desc}</div>
                    </div>
                  </div>
                  <div className="text-text-muted group-hover:text-white transition-colors">
                    {item.state ? <Loader2 size={18} className="animate-spin text-blue-400" /> : <DownloadCloud size={18} />}
                  </div>
                </button>
              ))}

              <div className="h-px bg-white/5 my-4"></div>
              
              <div className="text-center">
                <button onClick={handleExportAll} disabled={exportingAll}
                        className="w-full py-3 rounded-lg font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg flex items-center justify-center gap-2">
                  {exportingAll ? <Loader2 size={18} className="animate-spin" /> : <DownloadCloud size={18} />}
                  ⬇️ Download All 4 Files
                </button>
                {exportMessage && (
                  <p className="text-[11px] text-status-okay mt-2 font-medium animate-pulse">{exportMessage}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 4: Data Management */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Data Management</h2>
          <Card className="bg-bg-secondary border-white/5">
            <CardContent className="p-5 space-y-4">
              <button onClick={handleClearTestAttempts}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-status-shaky/20 hover:bg-status-shaky/5 transition-colors text-left">
                <div>
                  <div className="text-sm font-bold text-status-shaky">Clear all test attempts</div>
                  <div className="text-[10px] text-text-muted">Keeps topics & mocks intact</div>
                </div>
                <AlertTriangle size={16} className="text-status-shaky opacity-70" />
              </button>

              <button onClick={handleWipeAllData}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-colors text-left">
                <div>
                  <div className="text-sm font-medium text-red-500">Wipe All Data</div>
                  <div className="text-[10px] text-red-400">Deletes everything and logs you out</div>
                </div>
                <ChevronRight size={16} className="text-red-500 opacity-50" />
              </button>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 5: Account */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Account</h2>
          <Card className="bg-bg-secondary border-white/5">
            <CardContent className="p-5">
              <button onClick={handleLogout}
                      className="w-full py-3 rounded-lg font-medium text-red-400 bg-transparent hover:bg-white/5 transition-colors">
                Sign out
              </button>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 6: About */}
        <section>
          <Card className="bg-transparent border-none shadow-none">
            <CardContent className="p-0 text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                C
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">CAT Revision Engine</h3>
                <p className="text-xs text-text-muted mt-0.5">Built for CAT 2026</p>
              </div>
              <div className="text-[10px] text-text-muted/50 pt-2 space-y-1">
                <p>Version 1.0.0 (Build {new Date().toISOString().split('T')[0]})</p>
                <p>Powered by Supabase + Vercel</p>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}

// Icon for missing ChevronRight
const ChevronRight = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);
