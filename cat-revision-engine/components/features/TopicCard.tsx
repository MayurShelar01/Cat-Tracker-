import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Confidence } from "@/lib/utils/revisionEngine";
import Link from "next/link";

interface TopicCardProps {
  topicId?: string;
  topicName: string;
  section: string;
  dayNumber: number;
  tag?: string;
  round: number; // 1, 2, 3
  isOverdue?: boolean;
  isMockFlagged?: boolean;
  onComplete: (confidence: Confidence) => void;
  onSkip?: () => void;
}

export const TopicCard: React.FC<TopicCardProps> = ({
  topicId,
  topicName,
  section,
  dayNumber,
  tag,
  round,
  isOverdue,
  isMockFlagged,
  onComplete,
  onSkip
}) => {
  const [expanded, setExpanded] = useState(false);
  const [done, setDone] = useState(false);
  const [selectedConf, setSelectedConf] = useState<Confidence | null>(null);

  const getSectionBadgeVariant = (sec: string) => {
    if (sec === 'QUANT') return 'blue';
    if (sec === 'LRDI') return 'orange';
    if (sec === 'VARC') return 'green';
    return 'default';
  };

  const getRoundBadge = () => {
    if (round === 1) return null;
    if (round === 2) return <Badge variant="orange">R2</Badge>;
    if (round === 3) return <Badge variant="purple">R3</Badge>;
  };

  const getRoundBorder = () => {
    if (isOverdue) return 'border-l-status-overdue animate-[pulse_2s_ease-in-out_infinite]';
    if (round === 1) return 'border-l-round-r1';
    if (round === 2) return 'border-l-round-r2';
    if (round === 3) return 'border-l-round-r3';
    return 'border-l-transparent';
  };

  const handleConf = (conf: Confidence) => {
    setSelectedConf(conf);
    setDone(true);
    setExpanded(false);
    onComplete(conf);
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
                {topicId ? (
                  <Link href={`/topic/${topicId}`} className="hover:underline cursor-pointer">{topicName}</Link>
                ) : topicName}
              </h3>
              <span className="text-xs text-text-muted/70">
                Marked {selectedConf}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`transition-all duration-200 overflow-hidden border-y-white/5 border-r-white/5 border-l-[3px] bg-bg-secondary ${getRoundBorder()} mb-3`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Badge variant={getSectionBadgeVariant(section) as any}>{section}</Badge>
              <span className="text-xs font-semibold text-text-muted">Day {dayNumber}</span>
              {tag && <span className="text-[10px] uppercase tracking-wider font-bold text-text-secondary bg-white/5 px-1.5 py-0.5 rounded">{tag}</span>}
              {isOverdue && <span className="text-[10px] uppercase tracking-wider font-bold text-status-overdue bg-status-overdue/10 px-1.5 py-0.5 rounded">OVERDUE</span>}
              {isMockFlagged && <span className="text-[10px] uppercase tracking-wider font-bold text-status-shaky bg-status-shaky/10 px-1.5 py-0.5 rounded border border-status-shaky/20 flex items-center gap-1" title="Flagged from Mock — needs review"><span className="text-xs">⚠️</span> Flagged</span>}
            </div>
            <h3 className="font-medium text-text-primary leading-tight pr-4">
              {topicId ? (
                <Link href={`/topic/${topicId}`} className="hover:underline cursor-pointer">{topicName}</Link>
              ) : topicName}
            </h3>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getRoundBadge()}
          </div>
        </div>

        <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="pt-4 mt-2 border-t border-white/5">
              <p className="text-sm font-medium text-text-secondary mb-3 text-center">How confident are you?</p>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="bg-status-shaky/10 text-status-shaky border-status-shaky/30 hover:bg-status-shaky/20" onClick={() => handleConf('shaky')}>
                  🔴 Shaky
                </Button>
                <Button variant="outline" className="bg-status-okay/10 text-status-okay border-status-okay/30 hover:bg-status-okay/20" onClick={() => handleConf('okay')}>
                  🟡 Okay
                </Button>
                <Button variant="outline" className="bg-status-done/10 text-status-done border-status-done/30 hover:bg-status-done/20" onClick={() => handleConf('solid')}>
                  🟢 Solid
                </Button>
              </div>
              <div className="mt-3 text-center">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setExpanded(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>

        {!expanded && (
          <div className="mt-4 flex gap-2">
            <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-none shadow-none" onClick={() => setExpanded(true)}>
              {round === 1 ? 'Mark as Studied ✅' : 'Revised ✅'}
            </Button>
            {onSkip && (
              <Button variant="ghost" onClick={onSkip} className="px-3">
                Skip ⏭️
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
