import React from 'react';
import { PatrolVerificationResult, Level } from '../types/game';

interface PatrolResultModalProps {
  result: PatrolVerificationResult;
  level: Level;
  onClose: () => void;
  onRetry: () => void;
}

export const PatrolResultModal: React.FC<PatrolResultModalProps> = ({ result, level, onClose, onRetry }) => {
  const getGrade = (): { label: string; color: string; emoji: string } => {
    if (result.missedCount === 0) return { label: '完美', color: 'text-green-400', emoji: '🏆' };
    if (result.coveragePercent >= 90) return { label: '优秀', color: 'text-green-400', emoji: '🌟' };
    if (result.coveragePercent >= 70) return { label: '合格', color: 'text-yellow-400', emoji: '👍' };
    if (result.coveragePercent >= 50) return { label: '待改进', color: 'text-orange-400', emoji: '⚠️' };
    return { label: '不合格', color: 'text-red-400', emoji: '❌' };
  };

  const grade = getGrade();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-gray-700">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{grade.emoji}</div>
          <h2 className={`text-3xl font-bold ${grade.color}`}>巡逻验收 - {grade.label}</h2>
          <p className="text-gray-300 mt-2">三晚巡逻结果报告</p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
            <span className="text-gray-300 flex items-center gap-2">
              <span>🗺️</span> 巡逻区域总格数
            </span>
            <span className="text-white font-bold text-lg">{result.totalPatrolCells}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
            <span className="text-gray-300 flex items-center gap-2">
              <span>✅</span> 覆盖格数
            </span>
            <span className="text-green-400 font-bold text-lg">{result.totalPatrolCells - result.missedCount}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
            <span className="text-gray-300 flex items-center gap-2">
              <span>❌</span> 漏巡格数
            </span>
            <span className="text-red-400 font-bold text-lg">{result.missedCount}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
            <span className="text-gray-300 flex items-center gap-2">
              <span>📊</span> 覆盖率
            </span>
            <span className={`font-bold text-lg ${grade.color}`}>{result.coveragePercent}%</span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-white font-bold mb-3">📋 守卫明细</h3>
          <div className="space-y-2">
            {result.guardResults.map(gr => {
              const guard = level.grid.flat().find(c => c.guard?.id === gr.guardId)?.guard;
              return (
                <div key={gr.guardId} className="p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{guard?.emoji || '💂'}</span>
                    <span className="text-white font-medium">{gr.guardName}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      疲劳:{guard?.fatigue} 视野:{guard?.vision}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-1 bg-gray-800 rounded">
                      <div className="text-gray-400">完成晚数</div>
                      <div className="text-white font-bold">{gr.nightsCompleted}/3</div>
                    </div>
                    <div className="text-center p-1 bg-gray-800 rounded">
                      <div className="text-gray-400">巡逻格</div>
                      <div className="text-green-400 font-bold">{gr.totalVisited}</div>
                    </div>
                    <div className="text-center p-1 bg-gray-800 rounded">
                      <div className="text-gray-400">视野覆盖</div>
                      <div className="text-cyan-400 font-bold">{gr.totalSeen}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {result.missedCount > 0 && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
            <h3 className="text-blue-400 font-bold mb-2">💡 改进建议</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              {result.guardResults.some(gr => gr.nightsCompleted < 3) && (
                <li>• 守卫疲劳不足，考虑升级为疲劳值更高的守卫</li>
              )}
              {result.missedCount > result.totalPatrolCells * 0.3 && (
                <li>• 漏巡率过高，考虑增加守卫数量或优化巡逻路线</li>
              )}
              {result.guardResults.some(gr => gr.totalSeen < gr.totalVisited * 1.5) && (
                <li>• 视野覆盖不足，考虑使用视野更大的瞭望哨</li>
              )}
              {result.guardResults.length < 2 && result.totalPatrolCells > 20 && (
                <li>• 地图较大但守卫不足，建议增加守卫</li>
              )}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
          >
            🔄 重新回放
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg transition-colors"
          >
            ✏️ 返回编辑
          </button>
        </div>
      </div>
    </div>
  );
};
