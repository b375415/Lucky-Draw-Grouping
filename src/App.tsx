/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Users, Gift, LayoutGrid, Trash2, Upload, Download, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Participant {
  id: string;
  name: string;
}

type Tab = 'source' | 'draw' | 'group';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('source');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [inputText, setInputText] = useState('');
  const [autoDeduplicate, setAutoDeduplicate] = useState(true);
  
  // Lucky Draw State
  const [drawHistory, setDrawHistory] = useState<Participant[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<Participant | null>(null);
  const [allowRepeat, setAllowRepeat] = useState(false);

  // Grouping State
  const [groupSize, setGroupSize] = useState(3);
  const [groups, setGroups] = useState<Participant[][]>([]);

  // Derived State
  const availableParticipants = useMemo(() => {
    if (allowRepeat) return participants;
    return participants.filter(p => !drawHistory.find(h => h.id === p.id));
  }, [participants, drawHistory, allowRepeat]);

  // Handlers
  const handleAddFromText = () => {
    const names = inputText.split('\n').map(n => n.trim()).filter(n => n !== '');
    let newParticipants = names.map(name => ({
      id: Math.random().toString(36).substr(2, 9),
      name
    }));

    if (autoDeduplicate) {
      const existingNames = new Set(participants.map(p => p.name));
      newParticipants = newParticipants.filter(p => {
        if (existingNames.has(p.name)) return false;
        existingNames.add(p.name);
        return true;
      });
    }

    setParticipants(prev => [...prev, ...newParticipants]);
    setInputText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const names = results.data.flat().map(n => String(n).trim()).filter(n => n !== '');
        let newParticipants = names.map(name => ({
          id: Math.random().toString(36).substr(2, 9),
          name
        }));

        if (autoDeduplicate) {
          const existingNames = new Set(participants.map(p => p.name));
          newParticipants = newParticipants.filter(p => {
            if (existingNames.has(p.name)) return false;
            existingNames.add(p.name);
            return true;
          });
        }

        setParticipants(prev => [...prev, ...newParticipants]);
      },
      header: false
    });
  };

  const deduplicate = () => {
    const seen = new Set();
    const unique = participants.filter(p => {
      const duplicate = seen.has(p.name);
      seen.add(p.name);
      return !duplicate;
    });
    setParticipants(unique);
  };

  const clearParticipants = () => {
    setParticipants([]);
    setDrawHistory([]);
    setGroups([]);
  };

  const startDraw = () => {
    if (availableParticipants.length === 0) return;
    
    setIsDrawing(true);
    setCurrentWinner(null);

    let counter = 0;
    const duration = 2000;
    const interval = 50;
    const steps = duration / interval;

    const timer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      setCurrentWinner(availableParticipants[randomIndex]);
      counter++;

      if (counter >= steps) {
        clearInterval(timer);
        const finalWinner = availableParticipants[Math.floor(Math.random() * availableParticipants.length)];
        setCurrentWinner(finalWinner);
        setDrawHistory(prev => [finalWinner, ...prev]);
        setIsDrawing(false);
      }
    }, interval);
  };

  const handleGrouping = () => {
    if (participants.length === 0) return;
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const newGroups: Participant[][] = [];
    for (let i = 0; i < shuffled.length; i += groupSize) {
      newGroups.push(shuffled.slice(i, i + groupSize));
    }
    setGroups(newGroups);
  };

  const exportGroupsCSV = () => {
    const csvData = groups.flatMap((group, idx) => 
      group.map(p => ({ Group: `Group ${idx + 1}`, Name: p.name }))
    );
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'groups.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
            <Gift size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Lucky Draw & Grouping</h1>
            <p className="text-xs text-black/40 uppercase tracking-wider font-semibold">Professional Tool</p>
          </div>
        </div>
        
        <nav className="flex bg-black/5 p-1 rounded-xl">
          {[
            { id: 'source', label: 'Participants', icon: Users },
            { id: 'draw', label: 'Lucky Draw', icon: Gift },
            { id: 'group', label: 'Grouping', icon: LayoutGrid },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id 
                  ? "bg-white text-black shadow-sm" 
                  : "text-black/50 hover:text-black"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {/* DATA SOURCE TAB */}
          {activeTab === 'source' && (
            <motion.div
              key="source"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
                    <label className="block text-sm font-semibold mb-2 text-black/60 uppercase tracking-wide">
                      Paste Names (One per line)
                    </label>
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Enter names here..."
                      className="w-full h-64 p-4 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-black/5 resize-none font-mono text-sm"
                    />
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={handleAddFromText}
                        className="flex-1 bg-black text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-black/80 transition-colors"
                      >
                        <Plus size={18} />
                        Add to List
                      </button>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <button className="bg-white border border-black/10 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-black/5 transition-colors">
                          <Upload size={18} />
                          Upload CSV
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
                    <h3 className="font-bold mb-4 flex items-center justify-between">
                      List Summary
                      <span className="bg-black text-white text-xs px-2 py-1 rounded-full">
                        {participants.length}
                      </span>
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-4 bg-black/5 rounded-xl mb-2">
                        <div>
                          <p className="text-sm font-semibold">Auto-Deduplicate</p>
                          <p className="text-[10px] text-black/40">Remove duplicates on import</p>
                        </div>
                        <button
                          onClick={() => setAutoDeduplicate(!autoDeduplicate)}
                          className={cn(
                            "w-10 h-5 rounded-full transition-colors relative",
                            autoDeduplicate ? "bg-emerald-500" : "bg-black/20"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                            autoDeduplicate ? "left-5.5" : "left-0.5"
                          )} />
                        </button>
                      </div>
                      <button
                        onClick={deduplicate}
                        disabled={participants.length === 0}
                        className="w-full text-left px-4 py-3 rounded-xl border border-black/10 text-sm font-medium flex items-center justify-between hover:bg-black/5 transition-colors disabled:opacity-50"
                      >
                        Manual Deduplicate
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      </button>
                      <button
                        onClick={clearParticipants}
                        disabled={participants.length === 0}
                        className="w-full text-left px-4 py-3 rounded-xl border border-black/10 text-sm font-medium flex items-center justify-between hover:bg-red-50 text-red-600 border-red-100 transition-colors disabled:opacity-50"
                      >
                        Clear All
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 max-h-[400px] overflow-y-auto">
                    <h3 className="font-bold mb-4 text-sm text-black/60 uppercase tracking-wide">Current List</h3>
                    <div className="space-y-2">
                      {participants.length === 0 ? (
                        <p className="text-sm text-black/30 italic">No participants added yet.</p>
                      ) : (
                        participants.map((p, i) => (
                          <div key={p.id} className="flex items-center justify-between p-2 hover:bg-black/5 rounded-lg text-sm group">
                            <span className="flex items-center gap-3">
                              <span className="text-black/20 font-mono w-4">{i + 1}</span>
                              {p.name}
                            </span>
                            <button 
                              onClick={() => setParticipants(prev => prev.filter(item => item.id !== p.id))}
                              className="text-black/0 group-hover:text-black/40 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* LUCKY DRAW TAB */}
          {activeTab === 'draw' && (
            <motion.div
              key="draw"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-black rounded-3xl p-12 text-center relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center">
                    {/* Background Animation */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent animate-pulse" />
                    </div>

                    <AnimatePresence mode="wait">
                      {currentWinner ? (
                        <motion.div
                          key={currentWinner.id}
                          initial={{ scale: 0.5, opacity: 0, y: 20 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          className="relative z-10"
                        >
                          <p className="text-white/40 text-sm uppercase tracking-[0.3em] font-bold mb-4">
                            {isDrawing ? "Choosing..." : "Winner!"}
                          </p>
                          <h2 className={cn(
                            "text-6xl md:text-8xl font-black text-white tracking-tighter",
                            !isDrawing && "animate-bounce"
                          )}>
                            {currentWinner.name}
                          </h2>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-white/30 text-center"
                        >
                          <Gift size={64} className="mx-auto mb-4 opacity-20" />
                          <p className="text-xl font-medium">Ready to start the draw?</p>
                          <p className="text-sm mt-2">{availableParticipants.length} participants available</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="mt-12 relative z-10">
                      <button
                        onClick={startDraw}
                        disabled={isDrawing || availableParticipants.length === 0}
                        className="bg-white text-black px-12 py-4 rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {isDrawing ? "DRAWING..." : "DRAW NOW"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-lg">Draw Settings</h3>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-black/5 rounded-xl">
                      <div>
                        <p className="font-semibold">Allow Repeated Winners</p>
                        <p className="text-xs text-black/40">If enabled, the same person can win multiple times.</p>
                      </div>
                      <button
                        onClick={() => setAllowRepeat(!allowRepeat)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          allowRepeat ? "bg-black" : "bg-black/20"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          allowRepeat ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                    {participants.length === 0 && (
                      <div className="mt-4 p-4 bg-amber-50 rounded-xl flex items-start gap-3 text-amber-800 text-sm">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <p>No participants found. Please add names in the <b>Participants</b> tab first.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm h-fit">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold">History</h3>
                    <button 
                      onClick={() => setDrawHistory([])}
                      className="text-xs text-black/40 hover:text-red-500 font-bold uppercase tracking-wider"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-3">
                    {drawHistory.length === 0 ? (
                      <p className="text-sm text-black/30 italic">No history yet.</p>
                    ) : (
                      drawHistory.map((winner, i) => (
                        <motion.div
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          key={`${winner.id}-${i}`}
                          className="flex items-center justify-between p-3 bg-black/5 rounded-xl"
                        >
                          <span className="font-semibold text-sm">{winner.name}</span>
                          <span className="text-[10px] bg-black/10 px-2 py-1 rounded-full font-bold">
                            #{drawHistory.length - i}
                          </span>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* GROUPING TAB */}
          {activeTab === 'group' && (
            <motion.div
              key="group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-end gap-6">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold mb-2 text-black/60 uppercase tracking-wide">
                      People per Group
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={participants.length}
                      value={groupSize}
                      onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
                      className="w-full p-4 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-black/5 font-bold text-xl"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleGrouping}
                      disabled={participants.length === 0}
                      className="bg-black text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-black/80 transition-colors disabled:opacity-50"
                    >
                      <LayoutGrid size={20} />
                      Generate Groups
                    </button>
                    {groups.length > 0 && (
                      <button
                        onClick={exportGroupsCSV}
                        className="bg-white border border-black/10 px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-black/5 transition-colors"
                      >
                        <Download size={20} />
                        Export CSV
                      </button>
                    )}
                  </div>
                </div>
                {participants.length === 0 && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-xl flex items-start gap-3 text-amber-800 text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>Add participants first to enable grouping.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {groups.map((group, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-black/5">
                        <h3 className="font-black text-xl">Group {idx + 1}</h3>
                        <span className="text-xs bg-black text-white px-2 py-1 rounded-full font-bold">
                          {group.length} Members
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 p-2 bg-black/5 rounded-lg text-sm font-medium">
                            <div className="w-2 h-2 rounded-full bg-black/20" />
                            {p.name}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              
              {groups.length === 0 && participants.length > 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-black/10">
                  <LayoutGrid size={48} className="mx-auto mb-4 text-black/10" />
                  <p className="text-black/30 font-medium">Set group size and click generate to see results.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
