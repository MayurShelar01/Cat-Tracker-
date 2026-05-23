import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TestCardProps {
  topicId: string;
  topicName: string;
  section: string;
  round: number;
  totalQuestions: number;
  isDeferred?: boolean;
  onLogTest: (correct: number, total: number, timeTakenMin: number) => void;
}

export const TestCard: React.FC<TestCardProps> = ({
  topicId,
  topicName,
  section,
  round,
  totalQuestions,
  isDeferred,
  onLogTest
}) => {
  const [expanded, setExpanded] = useState(false);
  const [done, setDone] = useState(false);
  const [correct, setCorrect] = useState<string>("");
  const [timeTaken, setTimeTaken] = useState<string>("");

  const getSectionBadgeVariant = (sec: string) => {
    if (sec === 'QUANT') return 'blue';
    if (sec === 'LRDI') return 'orange';
    if (sec === 'VARC') return 'green';
    return 'default';
  };

  const handleLog = () => {
    const c = parseInt(correct);
    const t = parseInt(timeTaken);
    if (isNaN(c) || isNaN(t)) return;
    if (c < 0 || c > totalQuestions) {
      alert(`Correct answers cannot exceed ${totalQuestions}`);
      return;
    }
    
    setDone(true);
    setExpanded(false);
    onLogTest(c, totalQuestions, t);
  };

  if (done) {
    return (
      <Card className="border-l-[3px] border-y-white/5 border-r-white/5 border-l-status-done bg-status-done/5 transition-all opacity-80 h-16 overflow-hidden animate-flash">
        <CardContent className="p-4 flex justify-between items-center h-full">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-status-done/20 text-status-done flex items-center justify-center text-xs">
              ✓
            </div>
            <div>
              <h3 className="font-medium text-text-muted line-through decoration-white/20">
                <Link href={`/topic/${topicId}`} className="hover:underline cursor-pointer">{topicName}</Link>
              </h3>
              <span className="text-xs text-text-muted/70">
                Test Logged
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`transition-all duration-200 overflow-hidden border-y-white/5 border-r-white/5 border-l-[3px] border-l-round-r3 bg-bg-secondary mb-3 ${isDeferred ? 'opacity-50 grayscale' : ''}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Badge variant={getSectionBadgeVariant(section) as any}>{section}</Badge>
              <Badge variant="outline" className="text-[9px] py-0 bg-white/5 text-text-secondary border-none uppercase">R{round} Test</Badge>
              {isDeferred && <span className="text-[10px] uppercase tracking-wider font-bold text-status-shaky bg-status-shaky/10 px-1.5 py-0.5 rounded">Deferred (Daily Cap)</span>}
            </div>
            <h3 className="font-medium text-text-primary leading-tight pr-4">
              <Link href={`/topic/${topicId}`} className="hover:underline cursor-pointer">{topicName}</Link>
            </h3>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-text-primary">{totalQuestions} Qs</div>
          </div>
        </div>

        <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="pt-4 mt-2 border-t border-white/5">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Correct Answers (out of {totalQuestions})</label>
                  <input type="number" min="0" max={totalQuestions} value={correct} onChange={(e) => setCorrect(e.target.value)} 
                         className="w-full bg-bg-tertiary border border-white/10 rounded-lg p-2 text-sm text-text-primary text-center" placeholder="e.g. 7" />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Time Taken (minutes)</label>
                  <input type="number" min="1" value={timeTaken} onChange={(e) => setTimeTaken(e.target.value)} 
                         className="w-full bg-bg-tertiary border border-white/10 rounded-lg p-2 text-sm text-text-primary text-center" placeholder="e.g. 15" />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>Cancel</Button>
                <Button size="sm" onClick={handleLog} disabled={!correct || !timeTaken}>Log Test</Button>
              </div>
            </div>
          </div>
        </div>

        {!expanded && !isDeferred && (
          <div className="mt-4 flex gap-2">
            <Button className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 shadow-none" onClick={() => setExpanded(true)}>
              Log Test Results 📝
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
