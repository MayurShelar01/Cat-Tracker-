"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Topic } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';

interface TopicPickerProps {
  topics: Topic[];
  selectedId: string | null;
  onSelect: (topicId: string | null) => void;
  excludeIds?: string[];
  placeholder?: string;
}

export const TopicPicker: React.FC<TopicPickerProps> = ({
  topics,
  selectedId,
  onSelect,
  excludeIds = [],
  placeholder = "Search topics..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTopic = topics.find(t => t.id === selectedId);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTopics = topics.filter(t => 
    t.topic_name.toLowerCase().includes(search.toLowerCase())
  );

  const quantTopics = filteredTopics.filter(t => t.section === 'QUANT');
  const lrdiTopics = filteredTopics.filter(t => t.section === 'LRDI');
  const varcTopics = filteredTopics.filter(t => t.section === 'VARC');

  const renderTopicOption = (t: Topic) => {
    const isExcluded = excludeIds.includes(t.id) && t.id !== selectedId;
    const isSelected = t.id === selectedId;

    return (
      <div 
        key={t.id}
        onClick={() => {
          if (!isExcluded) {
            onSelect(t.id);
            setIsOpen(false);
            setSearch("");
          }
        }}
        className={`px-3 py-2 flex items-center justify-between text-sm ${
          isExcluded 
            ? 'opacity-30 cursor-not-allowed' 
            : 'cursor-pointer hover:bg-white/5'
        } ${isSelected ? 'bg-white/5 font-medium' : ''}`}
      >
        <span className="text-text-primary truncate mr-2">{t.topic_name}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-text-muted hidden sm:inline">Day {t.day_number}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {selectedTopic ? (
        <div className="flex items-center justify-between w-full bg-bg-tertiary border border-white/10 rounded-lg px-3 h-10">
          <div className="flex items-center gap-2 truncate">
            <Badge variant={selectedTopic.section === 'QUANT' ? 'blue' : selectedTopic.section === 'LRDI' ? 'orange' : 'green'} className="text-[10px] py-0 px-1.5 h-5">
              {selectedTopic.section}
            </Badge>
            <span className="text-sm text-text-primary truncate">{selectedTopic.topic_name}</span>
          </div>
          <button 
            type="button" 
            onClick={() => onSelect(null)}
            className="text-text-muted hover:text-white p-1 rounded-md hover:bg-white/10"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div 
          onClick={() => setIsOpen(true)}
          className="flex items-center w-full bg-bg-tertiary border border-white/10 rounded-lg px-3 h-10 cursor-text focus-within:border-white/30 transition-colors"
        >
          <Search size={14} className="text-text-muted mr-2 shrink-0" />
          <input 
            type="text"
            className="bg-transparent border-none outline-none text-sm text-text-primary w-full placeholder:text-text-muted"
            placeholder={placeholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
        </div>
      )}

      {isOpen && !selectedTopic && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-white/10 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto overflow-x-hidden">
          {filteredTopics.length === 0 ? (
            <div className="p-3 text-sm text-text-muted text-center">No topics found</div>
          ) : (
            <div className="py-1">
              {quantTopics.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold text-section-quant uppercase tracking-wider bg-bg-secondary sticky top-0 backdrop-blur-sm">QUANT</div>
                  {quantTopics.map(renderTopicOption)}
                </div>
              )}
              {lrdiTopics.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold text-section-lrdi uppercase tracking-wider bg-bg-secondary sticky top-0 backdrop-blur-sm">LRDI</div>
                  {lrdiTopics.map(renderTopicOption)}
                </div>
              )}
              {varcTopics.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold text-section-varc uppercase tracking-wider bg-bg-secondary sticky top-0 backdrop-blur-sm">VARC</div>
                  {varcTopics.map(renderTopicOption)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
