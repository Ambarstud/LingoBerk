'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function ReadingPage() {
  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">Reading</h1>
      </div>

      <div className="flex flex-col items-center justify-center pt-12">
        <div className="p-6 bg-green-100 dark:bg-green-900/30 rounded-2xl mb-6">
          <FileText size={48} className="text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5] mb-2">Coming Soon</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8 max-w-xs">
          YDS-style reading comprehension passages with main idea, inference, and vocabulary questions are coming in Phase 2.
        </p>

        <Card className="w-full">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-accent" />
            <div>
              <p className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">Phase 2 — Coming Soon</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">10+ passages with 5 questions each</p>
            </div>
          </div>
        </Card>

        <div className="mt-6 w-full space-y-3">
          {['Science & Technology', 'Social Sciences', 'Environment', 'History', 'Maritime'].map((cat) => (
            <div key={cat} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-[#242424] border border-gray-100 dark:border-gray-800 opacity-50">
              <span className="text-sm font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">{cat}</span>
              <span className="text-xs text-gray-400">Coming soon</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
