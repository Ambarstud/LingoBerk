'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Languages, MessageCircle, Play, Plus, RotateCcw, Send, Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { initCard } from '@/lib/spaced-repetition';
import { XP_VALUES } from '@/lib/xp-system';
import { useStore } from '@/store/useStore';
import type { ConversationScenario, FlashCard } from '@/lib/types';
import conversationData from '@/data/conversation-patterns.json';

type Screen = 'list' | 'scenario';
type Category = 'all' | ConversationScenario['category'];

const scenarios = conversationData as ConversationScenario[];

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  travel: 'Travel',
  work: 'Work',
  social: 'Social',
  maritime: 'Maritime',
  academic: 'Academic',
  daily: 'Daily',
};

const categoryOrder: Category[] = ['all', 'maritime', 'work', 'academic', 'travel', 'daily', 'social'];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function ConversationPage() {
  const { addXP } = useStore();
  const [screen, setScreen] = useState<Screen>('list');
  const [category, setCategory] = useState<Category>('all');
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [selectedScenario, setSelectedScenario] = useState<ConversationScenario | null>(null);
  const [translationLine, setTranslationLine] = useState<number | null>(null);
  const [openPhrase, setOpenPhrase] = useState<string | null>(null);
  const [addedPhrases, setAddedPhrases] = useState<Set<string>>(new Set());

  useEffect(() => {
    setProgress(storage.get<Record<string, boolean>>(STORAGE_KEYS.CONVERSATION_PROGRESS) ?? {});
  }, []);

  const filteredScenarios = useMemo(
    () => scenarios.filter((scenario) => category === 'all' || scenario.category === category),
    [category]
  );

  const completedCount = Object.values(progress).filter(Boolean).length;

  const openScenario = (scenario: ConversationScenario) => {
    setSelectedScenario(scenario);
    setTranslationLine(null);
    setOpenPhrase(null);
    setAddedPhrases(new Set());
    setScreen('scenario');
  };

  const markComplete = () => {
    if (!selectedScenario) return;
    const alreadyDone = progress[selectedScenario.id];
    const updated = { ...progress, [selectedScenario.id]: true };
    setProgress(updated);
    storage.set(STORAGE_KEYS.CONVERSATION_PROGRESS, updated);
    if (!alreadyDone) addXP(XP_VALUES.conversation);
  };

  const addPhraseToFlashcards = (phrase: ConversationScenario['keyPhrases'][number]) => {
    if (!selectedScenario) return;
    const cards = storage.get<FlashCard[]>(STORAGE_KEYS.FLASHCARDS) ?? [];
    const id = `conversation-${selectedScenario.id}-${normalize(phrase.phrase)}`;
    if (cards.some((card) => card.id === id || card.english.toLowerCase() === phrase.phrase.toLowerCase())) {
      setAddedPhrases((items) => new Set(items).add(phrase.phrase));
      return;
    }

    const card = initCard({
      id,
      english: phrase.phrase,
      turkish: phrase.meaning,
      example: phrase.examples[0] ?? phrase.usage,
      category: selectedScenario.category === 'maritime' ? 'maritime' : 'daily',
      difficulty: selectedScenario.difficulty,
      tags: ['conversation', selectedScenario.category, selectedScenario.id],
    });
    storage.set(STORAGE_KEYS.FLASHCARDS, [...cards, card]);
    setAddedPhrases((items) => new Set(items).add(phrase.phrase));
  };

  if (screen === 'scenario' && selectedScenario) {
    const isComplete = Boolean(progress[selectedScenario.id]);

    return (
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setScreen('list')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            type="button"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{selectedScenario.title}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {CATEGORY_LABELS[selectedScenario.category]} • {selectedScenario.difficulty}
            </p>
          </div>
        </div>

        <Card className="mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedScenario.description}</p>
        </Card>

        <div className="space-y-3 mb-4">
          {selectedScenario.dialogues.map((line, index) => {
            const isSpeakerA = line.speaker === 'A';
            const isOpen = translationLine === index;
            return (
              <div key={`${line.speaker}-${index}`} className={`flex ${isSpeakerA ? 'justify-start' : 'justify-end'}`}>
                <button
                  onClick={() => setTranslationLine(isOpen ? null : index)}
                  className={`max-w-[86%] rounded-2xl px-4 py-3 text-left shadow-sm ${
                    isSpeakerA
                      ? 'bg-white dark:bg-[#242424] border border-gray-100 dark:border-gray-800'
                      : 'bg-accent text-white'
                  }`}
                  type="button"
                >
                  <span className={`block text-[11px] font-semibold mb-1 ${isSpeakerA ? 'text-accent' : 'text-white/80'}`}>
                    Speaker {line.speaker}
                  </span>
                  <span className="block text-sm leading-relaxed">{line.text}</span>
                  {isOpen && (
                    <span className={`block mt-2 border-t pt-2 text-xs leading-relaxed ${isSpeakerA ? 'border-gray-100 text-gray-500 dark:border-gray-800 dark:text-gray-400' : 'border-white/20 text-white/85'}`}>
                      {line.turkishTranslation}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-warning" />
            <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">Key phrases</h2>
          </div>
          <div className="space-y-2">
            {selectedScenario.keyPhrases.map((phrase) => {
              const isOpen = openPhrase === phrase.phrase;
              return (
                <div key={phrase.phrase} className="rounded-lg bg-gray-50 dark:bg-gray-800/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => setOpenPhrase(isOpen ? null : phrase.phrase)} className="min-w-0 flex-1 text-left" type="button">
                      <span className="block text-sm font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">{phrase.phrase}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{phrase.meaning}</span>
                    </button>
                    <button
                      onClick={() => addPhraseToFlashcards(phrase)}
                      className="rounded-lg bg-white dark:bg-[#242424] p-2 text-accent min-h-[36px] min-w-[36px] flex items-center justify-center"
                      type="button"
                      title="Add to flashcards"
                    >
                      {addedPhrases.has(phrase.phrase) ? <CheckCircle size={16} /> : <Plus size={16} />}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{phrase.usage}</p>
                      <ul className="space-y-1">
                        {phrase.examples.slice(0, 2).map((example) => (
                          <li key={example} className="text-xs text-gray-700 dark:text-gray-300">
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Play size={16} className="text-success" />
            <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">Practice prompts</h2>
          </div>
          <div className="space-y-2">
            {selectedScenario.practicePrompts.map((prompt) => (
              <p key={prompt} className="rounded-lg bg-gray-50 dark:bg-gray-800/70 p-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {prompt}
              </p>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-3">
          <Link
            href={`/chat?scenario=${selectedScenario.id}`}
            className="w-full py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-[#1A1A1A] dark:text-[#F5F5F5] font-semibold flex items-center justify-center gap-2 min-h-[52px] active:scale-[0.98] transition-transform"
          >
            <Send size={18} />
            Practice with AI
          </Link>
          <Button fullWidth variant={isComplete ? 'success' : 'primary'} onClick={markComplete}>
            {isComplete ? (
              <>
                <CheckCircle size={18} />
                Completed
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Mark Complete +{XP_VALUES.conversation} XP
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">Conversation</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{completedCount}/{scenarios.length} scenarios complete</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4">
        {categoryOrder.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold min-h-[36px] ${
              category === item
                ? 'bg-accent text-white'
                : 'bg-white dark:bg-[#242424] text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-800'
            }`}
            type="button"
          >
            {CATEGORY_LABELS[item]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredScenarios.map((scenario) => {
          const isComplete = Boolean(progress[scenario.id]);
          return (
            <Card key={scenario.id} padding="sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{scenario.title}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {CATEGORY_LABELS[scenario.category]} • {scenario.difficulty} • {scenario.dialogues.length} lines
                    </p>
                  </div>
                </div>
                {isComplete && <CheckCircle size={18} className="text-success mt-1 shrink-0" />}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">{scenario.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {scenario.keyPhrases.slice(0, 3).map((phrase) => (
                  <span key={phrase.phrase} className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 text-[11px] text-gray-600 dark:text-gray-300">
                    {phrase.phrase}
                  </span>
                ))}
              </div>
              <button
                onClick={() => openScenario(scenario)}
                className="w-full rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white min-h-[38px] active:scale-95 transition-transform flex items-center justify-center gap-2"
                type="button"
              >
                {isComplete ? <RotateCcw size={14} /> : <Languages size={14} />}
                {isComplete ? 'Review Scenario' : 'Start Scenario'}
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
