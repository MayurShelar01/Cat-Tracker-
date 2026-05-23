"use client"

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVirtualToday, setVirtualToday, generateDailyQueue } from "@/lib/utils/revisionEngine";
import { clearDb, getDb, toDateString, addDays } from "@/lib/mockDb";

export const DevTools = () => {
  const [open, setOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Check URL param
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('dev') === 'true') {
        setOpen(true);
      }
    }
  }, []);

  const refreshState = async () => {
    const d = getVirtualToday();
    setCurrentDate(d);
    
    // Calculate stats
    const db = getDb();
    const r1Count = db.userTopics.filter(ut => ut.r1_status === 'done').length;
    const r2Pending = db.userTopics.filter(ut => ut.r1_status === 'done' && !ut.r2_completed_at).length;
    const r3Pending = db.userTopics.filter(ut => ut.r2_completed_at && !ut.r3_completed_at).length;
    
    const upcomingR2 = db.userTopics.filter(ut => ut.r2_due_at && !ut.r2_completed_at).map(ut => ut.r2_due_at).sort();
    const upcomingR3 = db.userTopics.filter(ut => ut.r3_due_at && !ut.r3_completed_at).map(ut => ut.r3_due_at).sort();

    const loadNext7Days = await Promise.all(Array.from({length: 7}).map(async (_, i) => {
      const target = addDays(d, i);
      // Run a simulation of generateDailyQueue to get load score (without saving it ideally, but saving is fine in mock)
      const res = await generateDailyQueue(toDateString(target));
      return { date: toDateString(target), score: res.loadScore };
    }));

    setStats({
      r1Count, r2Pending, r3Pending,
      upcomingR2: upcomingR2.slice(0, 5),
      upcomingR3: upcomingR3.slice(0, 5),
      loadNext7Days
    });
  };

  useEffect(() => {
    if (open) refreshState();
  }, [open]);

  if (!open) return null;

  const handleJump = (days: number) => {
    const newDate = addDays(currentDate, days);
    setVirtualToday(newDate);
    refreshState();
    window.location.reload();
  };

  const handleResetDate = () => {
    setVirtualToday(null);
    refreshState();
    window.location.reload();
  };

  const handleNuke = () => {
    if (confirm("Nuke all data and return to onboarding?")) {
      clearDb();
      window.location.href = "/login";
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] text-[#33FF33] p-4 shadow-xl shadow-black/50 z-50 max-h-[50vh] overflow-y-auto font-mono text-xs border-t border-[#33FF33]/30">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4 border-b border-[#33FF33]/30 pb-2">
          <h2 className="text-lg font-bold flex items-center gap-2">⚙️ TERMINAL</h2>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-[#33FF33] hover:bg-[#33FF33]/10">EXIT</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="font-bold mb-2">&gt; TIME TRAVEL</p>
              <div className="bg-[#111111] border border-[#33FF33]/20 p-2 rounded mb-2">
                CURRENT_ENGINE_DATE=<br/>
                <span className="text-[#00FF00] text-lg font-bold">{toDateString(currentDate)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="bg-transparent border-[#33FF33]/50 text-[#33FF33] hover:bg-[#33FF33]/20" onClick={() => handleJump(1)}>+1d</Button>
                <Button size="sm" variant="outline" className="bg-transparent border-[#33FF33]/50 text-[#33FF33] hover:bg-[#33FF33]/20" onClick={() => handleJump(7)}>+7d</Button>
                <Button size="sm" variant="outline" className="bg-transparent border-[#33FF33]/50 text-[#33FF33] hover:bg-[#33FF33]/20" onClick={() => handleJump(14)}>+14d</Button>
                <Button size="sm" variant="outline" className="bg-transparent border-[#33FF33]/50 text-[#33FF33] hover:bg-[#33FF33]/20" onClick={() => handleJump(45)}>+45d</Button>
              </div>
              <div className="mt-2">
                <Button size="sm" variant="outline" className="bg-transparent border-[#33FF33]/50 text-[#33FF33] hover:bg-[#33FF33]/20" onClick={handleResetDate}>RESET_DATE</Button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-[#33FF33]/30">
              <Button size="sm" variant="destructive" className="bg-red-900 border-red-500 text-red-500 font-bold hover:bg-red-800" onClick={handleNuke}>NUKE_ALL_DATA</Button>
            </div>
          </div>

          <div>
            <p className="font-bold mb-2">&gt; ENGINE_STATE</p>
            {stats && (
              <div className="space-y-3">
                <div className="bg-[#111111] border border-[#33FF33]/20 p-2 rounded grid grid-cols-3 gap-2 text-center text-[#33FF33]/80">
                  <div><div className="text-xl text-[#33FF33] font-bold">{stats.r1Count}</div>R1_DONE</div>
                  <div><div className="text-xl text-[#33FF33] font-bold">{stats.r2Pending}</div>R2_WAIT</div>
                  <div><div className="text-xl text-[#33FF33] font-bold">{stats.r3Pending}</div>R3_WAIT</div>
                </div>
                
                <div>
                  <p className="font-bold mb-1 opacity-70">LOAD_SCORES [T..T+6]</p>
                  <div className="flex gap-1">
                    {stats.loadNext7Days.map((d: any) => (
                      <div key={d.date} className="flex-1 bg-[#111111] border border-[#33FF33]/20 p-1 text-center rounded" title={d.date}>
                        <div className={`font-bold ${d.score > 9 ? 'text-red-500' : d.score > 7 ? 'text-yellow-500' : 'text-[#33FF33]'}`}>
                          {d.score}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
