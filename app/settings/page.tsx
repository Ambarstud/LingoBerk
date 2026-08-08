'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Moon, Sun, Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/store/useStore';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import type { FlashCard, UserStats, StreakData, UserSettings } from '@/lib/types';

export default function SettingsPage() {
  const { settings, userStats, streakData, setDarkMode, setDailyGoal, setNewCardsPerDay, setExamDate, refreshStats } = useStore();
  const [goalInput, setGoalInput] = useState(settings.dailyGoal.toString());
  const [newCardsInput, setNewCardsInput] = useState((settings.newCardsPerDay ?? 30).toString());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handleGoalChange(value: string) {
    setGoalInput(value);
    const num = parseInt(value);
    if (!isNaN(num) && num >= 50 && num <= 2000) {
      setDailyGoal(num);
    }
  }

  function handleNewCardsChange(value: string) {
    setNewCardsInput(value);
    const num = parseInt(value);
    if (!isNaN(num) && num >= 5 && num <= 500) {
      setNewCardsPerDay(num);
    }
  }

  function exportData() {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      flashcards: storage.get<FlashCard[]>(STORAGE_KEYS.FLASHCARDS),
      customCards: storage.get<FlashCard[]>(STORAGE_KEYS.CUSTOM_CARDS),
      grammarProgress: storage.get(STORAGE_KEYS.GRAMMAR_PROGRESS),
      readingProgress: storage.get(STORAGE_KEYS.READING_PROGRESS),
      userStats: storage.get<UserStats>(STORAGE_KEYS.USER_STATS),
      settings: storage.get<UserSettings>(STORAGE_KEYS.SETTINGS),
      streak: storage.get<StreakData>(STORAGE_KEYS.STREAK),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lingoberk-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Veriler dışa aktarıldı');
  }

  function importData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.flashcards) storage.set(STORAGE_KEYS.FLASHCARDS, data.flashcards);
        if (data.customCards) storage.set(STORAGE_KEYS.CUSTOM_CARDS, data.customCards);
        if (data.grammarProgress) storage.set(STORAGE_KEYS.GRAMMAR_PROGRESS, data.grammarProgress);
        if (data.readingProgress) storage.set(STORAGE_KEYS.READING_PROGRESS, data.readingProgress);
        if (data.userStats) storage.set(STORAGE_KEYS.USER_STATS, data.userStats);
        if (data.settings) storage.set(STORAGE_KEYS.SETTINGS, data.settings);
        if (data.streak) storage.set(STORAGE_KEYS.STREAK, data.streak);
        refreshStats();
        showToast('Veriler içe aktarıldı');
      } catch {
        showToast('Hata: geçersiz dosya biçimi');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function clearAllData() {
    storage.clear();
    refreshStats();
    setShowClearConfirm(false);
    showToast('Tüm veriler silindi');
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] dark:bg-white text-white dark:text-[#1A1A1A] px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">Ayarlar</h1>
      </div>

      <div className="space-y-4">
        {/* Daily Goal */}
        <Card>
          <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">Günlük XP Hedefi</h2>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={50}
              max={500}
              step={50}
              value={parseInt(goalInput) || settings.dailyGoal}
              onChange={(e) => handleGoalChange(e.target.value)}
              className="flex-1 accent-accent h-2 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <input
                type="number"
                value={goalInput}
                onChange={(e) => handleGoalChange(e.target.value)}
                min={50}
                max={2000}
                className="w-16 px-2 py-1.5 text-center text-sm bg-white dark:bg-[#242424] text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none"
              />
              <span className="pr-2 text-sm text-gray-500 dark:text-gray-400">XP</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Şu an: günde {settings.dailyGoal} XP</p>
        </Card>

        {/* Günlük Yeni Kelime */}
        <Card>
          <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mb-1">Günlük Yeni Kelime</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Her gün kaç yeni kelime gösterilsin (tekrarlar buna dahil değil).</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={parseInt(newCardsInput) || (settings.newCardsPerDay ?? 30)}
              onChange={(e) => handleNewCardsChange(e.target.value)}
              className="flex-1 accent-accent h-2 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <input
                type="number"
                value={newCardsInput}
                onChange={(e) => handleNewCardsChange(e.target.value)}
                min={5}
                max={500}
                className="w-16 px-2 py-1.5 text-center text-sm bg-white dark:bg-[#242424] text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none"
              />
              <span className="pr-2 text-sm text-gray-500 dark:text-gray-400">kelime</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Şu an: günde {settings.newCardsPerDay ?? 30} yeni kelime</p>
        </Card>

        {/* Sınav Tarihi */}
        <Card>
          <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mb-1">Sınav Tarihi</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Ana ekrandaki geri sayım bu tarihe göre hesaplanır.</p>
          <input
            type="date"
            value={settings.examDate ?? '2026-11-22'}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#242424] text-[#1A1A1A] dark:text-[#F5F5F5] text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </Card>

        {/* Dark Mode */}
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.darkMode ? <Moon size={20} className="text-accent" /> : <Sun size={20} className="text-warning" />}
              <div>
                <p className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">Karanlık Mod</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{settings.darkMode ? 'Koyu tema açık' : 'Açık tema aktif'}</p>
              </div>
            </div>
            <button
              onClick={() => setDarkMode(!settings.darkMode)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                settings.darkMode ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label="Toggle dark mode"
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                settings.darkMode ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </Card>

        {/* Stats Summary */}
        <Card>
          <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">İlerlemen</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-lg font-bold text-accent">{userStats.totalXP}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Toplam XP</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{userStats.cardsReviewed}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Çalışılan Kart</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-lg font-bold text-success">{streakData.bestStreak}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">En İyi Seri</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-lg font-bold text-warning">{streakData.currentStreak}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Güncel Seri</p>
            </div>
          </div>
        </Card>

        {/* Data Management */}
        <Card>
          <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">Veri Yönetimi</h2>
          <div className="space-y-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={exportData}
            >
              <Download size={16} />
              Verileri Dışa Aktar
            </Button>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              Verileri İçe Aktar
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
            />
          </div>
        </Card>

        {/* Danger Zone */}
        <Card>
          <h2 className="font-semibold text-error mb-3 flex items-center gap-2">
            <AlertTriangle size={16} />
            Tehlikeli Bölge
          </h2>
          {showClearConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bu işlem TÜM verilerini (kart ilerlemesi, seriler, istatistikler) kalıcı olarak siler. Geri alınamaz.
              </p>
              <div className="flex gap-2">
                <Button variant="danger" fullWidth onClick={clearAllData}>
                  Evet, Hepsini Sil
                </Button>
                <Button variant="secondary" fullWidth onClick={() => setShowClearConfirm(false)}>
                  Vazgeç
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="danger"
              fullWidth
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 size={16} />
              Tüm Verileri Sil
            </Button>
          )}
        </Card>

        {/* App Info */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-400 dark:text-gray-600">LingoBerk v0.1.0</p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">YDS'ye kişisel hazırlık</p>
        </div>
      </div>
    </div>
  );
}
