'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, CalendarDays, PenLine, MessagesSquare } from 'lucide-react';
import { useStore } from '@/store/useStore';

const navItems = [
  { href: '/', label: 'Ana Sayfa', icon: Home },
  { href: '/flashcards', label: 'Kartlar', icon: BookOpen },
  { href: '/program', label: 'Program', icon: CalendarDays },
  { href: '/grammar', label: 'Gramer', icon: PenLine },
  { href: '/conversation', label: 'Konuşma', icon: MessagesSquare },
];

export function BottomNav() {
  const pathname = usePathname();
  const immersive = useStore((s) => s.immersive);

  if (immersive) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#242424] border-t border-gray-100 dark:border-gray-800">
      <div className="max-w-[480px] mx-auto flex items-center justify-around" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[60px] min-h-[56px] transition-colors duration-150 ${
                isActive
                  ? 'text-accent'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
