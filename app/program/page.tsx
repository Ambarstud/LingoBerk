'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronDown,
  Video,
  BookOpen,
  ListChecks,
  FileText,
  RotateCcw,
  Minus,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useStore } from '@/store/useStore';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { daysUntil, todayStr } from '@/lib/daily';
import curriculum from '@/data/curriculum.json';

type TaskType = 'video' | 'book' | 'questions' | 'exam' | 'review';

interface CurriculumTask {
  id: string;
  type: TaskType;
  label: string;
  url?: string;
  target?: number;
}

interface CurriculumWeek {
  week: number;
  startDate: string;
  theme: string;
  tasks: CurriculumTask[];
}

interface TaskState {
  done: boolean;
  done_at: string | null;
  solved?: number;
}

type ProgressMap = Record<string, TaskState>;

const TYPE_ICON: Record<TaskType, typeof Video> = {
  video: Video,
  book: BookOpen,
  questions: ListChecks,
  exam: FileText,
  review: RotateCcw,
};

const TYPE_LABEL: Record<TaskType, string> = {
  video: 'Video',
  book: 'Kitap',
  questions: 'Soru',
  exam: 'Deneme',
  review: 'Tekrar',
};

const weeks = (curriculum.weeks as CurriculumWeek[]) ?? [];

function currentWeekIndex(): number {
  const today = todayStr();
  let idx = 0;
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i].startDate <= today) idx = i;
  }
  return idx;
}

export default function ProgramPage() {
  const { settings } = useStore();
  const [progress, setProgress] = useState<ProgressMap>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    const saved = storage.get<ProgressMap>(STORAGE_KEYS.TASK_PROGRESS) ?? {};
    setProgress(saved);
    setExpanded(new Set([currentWeekIndex()]));
  }, []);

  const examDateStr = settings.examDate || curriculum.examDate || '2026-11-22';
  const daysToExam = daysUntil(examDateStr);
  const curIdx = currentWeekIndex();

  function persist(next: ProgressMap) {
    setProgress(next);
    storage.set(STORAGE_KEYS.TASK_PROGRESS, next);
  }

  function toggleTask(id: string) {
    const prev = progress[id];
    const done = !(prev?.done ?? false);
    persist({ ...progress, [id]: { ...prev, done, done_at: done ? todayStr() : null } });
  }

  function updateSolved(id: string, delta: number, target: number) {
    const prev = progress[id] ?? { done: false, done_at: null, solved: 0 };
    const solved = Math.max(0, (prev.solved ?? 0) + delta);
    const done = target > 0 ? solved >= target : prev.done;
    persist({
      ...progress,
      [id]: { ...prev, solved, done, done_at: done && !prev.done ? todayStr() : prev.done_at },
    });
  }

  function toggleWeek(i: number) {
    const next = new Set(expanded);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setExpanded(next);
  }

  const weekStats = useMemo(() => {
    return weeks.map((w) => {
      const total = w.tasks.length;
      const done = w.tasks.filter((t) => progress[t.id]?.done).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { total, done, pct };
    });
  }, [progress]);

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto bg-white dark:bg-[#1A1A1A] min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] tracking-tight">Program</h1>
      </div>

      {/* Sınav geri sayımı */}
      <div className="rounded-2xl bg-gradient-to-br from-accent to-blue-700 text-white p-4 shadow-lg shadow-accent/20 flex items-center gap-4 mb-6">
        <div className="p-2.5 rounded-xl bg-white/15">
          <CalendarClock size={22} />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">YDS Sınavına</p>
          <p className="text-2xl font-black leading-tight">
            {daysToExam > 0 ? `${daysToExam} gün` : daysToExam === 0 ? 'Bugün! 🎯' : 'Sınav geçti'}
          </p>
        </div>
        <p className="text-xs font-medium text-white/70 text-right">15 haftalık plan</p>
      </div>

      <div className="space-y-3">
        {weeks.map((w, i) => {
          const stats = weekStats[i] ?? { total: 0, done: 0, pct: 0 };
          const isCurrent = i === curIdx;
          const isPast = i < curIdx;
          const isOpen = expanded.has(i);
          const incompletePast = isPast && stats.total > 0 && stats.done < stats.total;

          return (
            <Card key={w.week} padding="none" className={isCurrent ? 'border-accent/40 ring-1 ring-accent/20' : ''}>
              {/* Hafta başlığı */}
              <button
                onClick={() => toggleWeek(i)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                    isCurrent
                      ? 'bg-accent text-white'
                      : incompletePast
                        ? 'bg-red-100 dark:bg-red-900/20 text-error'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}
                >
                  {w.week}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-[#1A1A1A] dark:text-[#F5F5F5] truncate">
                      {w.theme === 'TBD' ? 'Belirlenecek' : w.theme}
                    </p>
                    {isCurrent && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-accent/10 text-accent uppercase tracking-widest shrink-0">
                        Bu hafta
                      </span>
                    )}
                    {incompletePast && <AlertCircle size={14} className="text-error shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {w.tasks.length > 0 ? `${stats.done}/${stats.total} görev · %${stats.pct}` : 'Görev eklenmedi'}
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* İlerleme çubuğu */}
              {w.tasks.length > 0 && (
                <div className="px-4 -mt-1 mb-1">
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stats.pct === 100 ? 'bg-success' : 'bg-accent'
                      }`}
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Görevler */}
              {isOpen && (
                <div className="px-4 pb-4 pt-2 space-y-2">
                  {w.tasks.length === 0 && (
                    <p className="text-xs text-gray-400 italic py-2">
                      Bu hafta için görev yok. data/curriculum.json dosyasından ekleyebilirsin.
                    </p>
                  )}
                  {w.tasks.map((t) => {
                    const Icon = TYPE_ICON[t.type];
                    const st = progress[t.id];
                    const done = st?.done ?? false;
                    return (
                      <div
                        key={t.id}
                        className={`rounded-2xl border p-3 ${
                          done
                            ? 'border-success/30 bg-success/5'
                            : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleTask(t.id)}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                              done ? 'bg-success border-success text-white' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            aria-label="Tamamlandı"
                          >
                            {done && <Check size={14} strokeWidth={3} />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-medium truncate ${
                                done ? 'text-gray-400 line-through' : 'text-[#1A1A1A] dark:text-[#F5F5F5]'
                              }`}
                            >
                              {t.label}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                              <Icon size={11} /> {TYPE_LABEL[t.type]}
                            </span>
                          </div>
                          {t.url && (
                            <a
                              href={t.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-accent shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Aç →
                            </a>
                          )}
                        </div>

                        {/* Soru sayacı */}
                        {t.type === 'questions' && t.target && (
                          <div className="flex items-center justify-between mt-3 pl-9">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                              {st?.solved ?? 0} / {t.target} çözüldü
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateSolved(t.id, -5, t.target!)}
                                className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center active:scale-95"
                              >
                                <Minus size={14} />
                              </button>
                              <button
                                onClick={() => updateSolved(t.id, 5, t.target!)}
                                className="h-8 w-8 rounded-lg bg-accent text-white flex items-center justify-center active:scale-95"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
        Program içeriğini <span className="font-mono">data/curriculum.json</span> dosyasından düzenleyebilirsin.
      </p>
    </div>
  );
}
