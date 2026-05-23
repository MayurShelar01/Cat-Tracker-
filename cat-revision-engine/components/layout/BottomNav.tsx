"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, BarChart2, Settings } from 'lucide-react';

export const BottomNav = () => {
  const pathname = usePathname();

  if (!pathname) return null;

  if (pathname.startsWith('/login') || pathname.startsWith('/onboarding')) {
    return null;
  }

  const navItems = [
    { name: 'Today', href: '/today', icon: Home, activeColor: 'text-section-quant', disabled: false },
    { name: 'Mocks', href: '/mocks', icon: ClipboardList, activeColor: 'text-section-lrdi', disabled: false },
    { name: 'Dashboard', href: '/dashboard', icon: BarChart2, activeColor: 'text-section-varc', disabled: false },
    { name: 'Settings', href: '/settings', icon: Settings, activeColor: 'text-white', disabled: false },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[68px] bg-bg-primary/95 backdrop-blur-xl border-t border-white/5 z-50">
      <div className="max-w-md mx-auto h-full flex justify-around items-center px-4 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && item.href !== '#';
          const Icon = item.icon;
          
          if (item.disabled) {
            return (
              <div key={item.name} className="flex flex-col items-center justify-center gap-1 opacity-40 cursor-not-allowed h-full w-16">
                <Icon size={22} className="text-text-muted" />
                <span className="text-[10px] font-medium text-text-muted">{item.name}</span>
              </div>
            );
          }
          
          return (
            <Link key={item.name} href={item.href} className="flex flex-col items-center justify-center gap-1 h-full w-16 group">
              <Icon 
                size={22} 
                className={`transition-colors ${isActive ? item.activeColor : 'text-text-muted group-hover:text-text-secondary'}`} 
              />
              <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-text-primary' : 'text-text-muted group-hover:text-text-secondary'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
