import React, { useState, useEffect } from 'react';
import { Level, PatrolVerificationResult, PatrolNightRecord, Position } from '../types/game';

interface PatrolReplayProps {
  level: Level;
  result: PatrolVerificationResult;
  onFinished: () => void;
  onBack: () => void;
}

export const PatrolReplay: React.FC<PatrolReplayProps> = ({ level, result, onFinished, onBack }) => {
  const [currentNight, setCurrentNight] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(300);
  const [replayDone, setReplayDone] = useState(false);

  const nightRecords = result.nights.filter(n => n.night === currentNight + 1);

  useEffect(() => {
    if (!isPlaying) return;

    const allDone = currentNight >= 3;
    if (allDone) {
      setIsPlaying(false);
      setReplayDone(true);
      return;
    }

    const maxSteps = Math.max(
      ...nightRecords.map(n => n.visitedCells.length),
      1
    );

    if (currentStep >= maxSteps) {
      const timer = setTimeout(() => {
        if (currentNight < 2) {
          setCurrentNight(prev => prev + 1);
          setCurrentStep(0);
        } else {
          setIsPlaying(false);
          setReplayDone(true);
        }
      }, speed * 2);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentNight, currentStep, nightRecords, speed]);

  const handleStartReplay = () => {
    setCurrentNight(0);
    setCurrentStep(0);
    setReplayDone(false);
    setIsPlaying(true);
  };

  const getGuardPosition = (record: PatrolNightRecord): Position | null => {
    if (currentStep === 0) return null;
    const idx = Math.min(currentStep - 1, record.visitedCells.length - 1);
    return record.visitedCells[idx] || null;
  };

  const isCellVisited = (x: number, y: number): boolean => {
    for (const record of nightRecords) {
      const step = Math.min(currentStep, record.visitedCells.length);
      for (let i = 0; i < step; i++) {
        if (record.visitedCells[i]?.x === x && record.visitedCells[i]?.y === y) {
          return true;
        }
      }
    }
    return false;
  };

  const isCellSeen = (x: number, y: number): boolean => {
    for (const record of nightRecords) {
      if (currentStep < record.visitedCells.length) {
        return record.seenCells.some(s => s.x === x && s.y === y);
      }
    }
    return false;
  };

  const isCellMissed = (x: number, y: number): boolean => {
    return result.missedCells.some(m => m.x === x && m.y === y);
  };

  const getCellDisplay = (x: number, y: number): { bg: string; content: string } => {
    const cell = level.grid[y][x];

    for (const record of nightRecords) {
      const guardPos = getGuardPosition(record);
      if (guardPos && guardPos.x === x && guardPos.y === y) {
        const guard = level.grid[guardPos.y]?.[guardPos.x]?.guard;
        return { bg: 'bg-cyan-500 ring-2 ring-cyan-300 animate-pulse', content: guard?.emoji || '💂' };
      }
    }

    if (isCellVisited(x, y)) {
      return { bg: 'bg-green-700', content: getBaseContent(cell) };
    }

    if (isCellSeen(x, y)) {
      return { bg: 'bg-green-900/50', content: getBaseContent(cell) };
    }

    if (replayDone && isCellMissed(x, y)) {
      return { bg: 'bg-red-900 ring-1 ring-red-500', content: '❌' };
    }

    return { bg: getBaseBg(cell), content: getBaseContent(cell) };
  };

  const getBaseContent = (cell: typeof level.grid[0][0]): string => {
    switch (cell.type) {
      case 'start': return '🚪';
      case 'end': return '🏆';
      case 'monster': return cell.monster?.emoji || '👾';
      case 'trap': return cell.trap?.emoji || '⚠️';
      case 'treasure': return cell.treasure?.emoji || '📦';
      case 'wall': return '🧱';
      case 'floor': return '·';
      case 'guard': return cell.guard?.emoji || '💂';
      default: return '';
    }
  };

  const getBaseBg = (cell: typeof level.grid[0][0]): string => {
    switch (cell.type) {
      case 'start': return 'bg-green-600';
      case 'end': return 'bg-yellow-500';
      case 'wall': return 'bg-gray-700';
      case 'floor': return 'bg-stone-600';
      case 'monster': return 'bg-red-900';
      case 'trap': return 'bg-orange-900';
      case 'treasure': return 'bg-amber-700';
      case 'guard': return 'bg-indigo-800';
      default: return 'bg-gray-900';
    }
  };

  const nightLabels = ['第一晚', '第二晚', '第三晚'];
  const nightEmoji = ['🌙', '🌑', '🌑'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-white font-bold text-lg">
            🔍 巡逻回放 {nightEmoji[currentNight]} {nightLabels[currentNight] || '已结束'}
          </h3>
          {!replayDone && currentNight < 3 && (
            <span className="text-sm text-gray-400">
              步骤 {currentStep}/{Math.max(...nightRecords.map(n => n.visitedCells.length), 0)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="px-2 py-1 bg-gray-700 rounded text-sm text-white"
          >
            <option value={600}>慢速</option>
            <option value={300}>正常</option>
            <option value={150}>快速</option>
            <option value={50}>极速</option>
          </select>
          {!isPlaying && !replayDone && (
            <button
              onClick={handleStartReplay}
              className="px-4 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-bold"
            >
              ▶️ 开始回放
            </button>
          )}
          {isPlaying && (
            <button
              onClick={() => setIsPlaying(false)}
              className="px-4 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-bold"
            >
              ⏸️ 暂停
            </button>
          )}
          {!isPlaying && replayDone && (
            <button
              onClick={handleStartReplay}
              className="px-4 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold"
            >
              🔄 重新回放
            </button>
          )}
          <button
            onClick={onBack}
            className="px-4 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          >
            ✏️ 返回编辑
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div
            className="inline-grid gap-1 p-4 bg-gray-800 rounded-lg"
            style={{ gridTemplateColumns: `repeat(${level.width}, minmax(0, 1fr))` }}
          >
            {level.grid.map((row, y) =>
              row.map((cell, x) => {
                const display = getCellDisplay(x, y);
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`w-10 h-10 flex items-center justify-center text-lg rounded transition-all ${display.bg}`}
                  >
                    {display.content}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-cyan-500 rounded"></span> 守卫位置
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-700 rounded"></span> 已巡逻
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-900/50 rounded"></span> 视野覆盖
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-900 rounded"></span> 漏巡
            </span>
          </div>
        </div>

        <div className="w-64 space-y-3">
          {nightRecords.map(record => {
            const guard = level.grid.flat().find(c => c.guard?.id === record.guardId)?.guard;
            const step = Math.min(currentStep, record.visitedCells.length);
            return (
              <div key={record.guardId} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{guard?.emoji || '💂'}</span>
                  <span className="text-white font-medium text-sm">{guard?.name || '守卫'}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>疲劳</span>
                    <span className="text-white">{record.fatigueUsed}/{record.fatigueTotal}</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 transition-all"
                      style={{ width: `${(record.fatigueUsed / record.fatigueTotal) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>巡逻进度</span>
                    <span className="text-white">{step}/{record.visitedCells.length}</span>
                  </div>
                  {record.stoppedEarly && (
                    <div className="text-red-400 font-bold mt-1">⚠ 疲劳提前停止</div>
                  )}
                </div>
              </div>
            );
          })}

          {result.guardResults.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-3">
              <h4 className="text-white font-bold text-sm mb-2">📊 巡逻统计</h4>
              {result.guardResults.map(gr => {
                const guard = level.grid.flat().find(c => c.guard?.id === gr.guardId)?.guard;
                return (
                  <div key={gr.guardId} className="text-xs space-y-1 mb-2">
                    <div className="text-gray-300">{guard?.emoji} {gr.guardName}</div>
                    <div className="flex justify-between text-gray-400">
                      <span>完整完成晚数</span>
                      <span className="text-white">{gr.nightsCompleted}/3</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>累计巡逻格</span>
                      <span className="text-green-400">{gr.totalVisited}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>累计视野覆盖</span>
                      <span className="text-cyan-400">{gr.totalSeen}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {replayDone && (
            <div className={`rounded-lg p-4 text-center ${
              result.missedCount === 0 ? 'bg-green-900/50 border border-green-600' :
              result.coveragePercent >= 70 ? 'bg-yellow-900/50 border border-yellow-600' :
              'bg-red-900/50 border border-red-600'
            }`}>
              <div className="text-3xl mb-2">
                {result.missedCount === 0 ? '✅' : result.coveragePercent >= 70 ? '⚠️' : '❌'}
              </div>
              <div className="text-white font-bold">
                覆盖率: {result.coveragePercent}%
              </div>
              <div className="text-sm text-gray-300 mt-1">
                漏巡格数: {result.missedCount}/{result.totalPatrolCells}
              </div>
              <button
                onClick={onFinished}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold w-full"
              >
                查看验收报告
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
