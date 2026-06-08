import React, { useState, useCallback } from 'react';
import { Level, Cell, CellType, Position, Monster, Trap, Treasure, Guard, PatrolRoute } from '../types/game';
import { MONSTER_TEMPLATES, TRAP_TEMPLATES, TREASURE_TEMPLATES, GUARD_TEMPLATES } from '../data/templates';
import { isAdjacentToRouteEnd, isCellWalkable } from '../utils/patrolEngine';

type ToolType = CellType | 'eraser' | 'patrol_route';

interface MapEditorProps {
  level: Level;
  onChange: (level: Level) => void;
}

export const MapEditor: React.FC<MapEditorProps> = ({ level, onChange }) => {
  const [selectedTool, setSelectedTool] = useState<ToolType>('floor');
  const [selectedMonster, setSelectedMonster] = useState(MONSTER_TEMPLATES[0]);
  const [selectedTrap, setSelectedTrap] = useState(TRAP_TEMPLATES[0]);
  const [selectedTreasure, setSelectedTreasure] = useState(TREASURE_TEMPLATES[0]);
  const [selectedGuard, setSelectedGuard] = useState(GUARD_TEMPLATES[0]);
  const [isSettingStart, setIsSettingStart] = useState(false);
  const [isSettingEnd, setIsSettingEnd] = useState(false);
  const [drawingRouteGuardId, setDrawingRouteGuardId] = useState<string | null>(null);

  const createEmptyGrid = useCallback((width: number, height: number): Cell[][] => {
    return Array(height).fill(null).map(() =>
      Array(width).fill(null).map(() => ({ type: 'empty' as CellType }))
    );
  }, []);

  const handleCellClick = (x: number, y: number) => {
    if (isSettingStart) {
      const newGrid = level.grid.map(row => row.map(cell => ({ ...cell })));
      newGrid[level.startPos.y][level.startPos.x] = { type: 'floor' };
      newGrid[y][x] = { type: 'start' };
      onChange({ ...level, grid: newGrid, startPos: { x, y } });
      setIsSettingStart(false);
      return;
    }

    if (isSettingEnd) {
      const newGrid = level.grid.map(row => row.map(cell => ({ ...cell })));
      newGrid[level.endPos.y][level.endPos.x] = { type: 'floor' };
      newGrid[y][x] = { type: 'end' };
      onChange({ ...level, grid: newGrid, endPos: { x, y } });
      setIsSettingEnd(false);
      return;
    }

    if (selectedTool === 'patrol_route') {
      handleRouteClick(x, y);
      return;
    }

    const newGrid = level.grid.map(row => row.map(cell => ({ ...cell })));

    if (selectedTool === 'eraser') {
      const cell = newGrid[y][x];
      if (cell.guard) {
        const newRoutes = level.patrolRoutes.filter(r => r.guardId !== cell.guard!.id);
        newGrid[y][x] = { type: 'floor' };
        onChange({ ...level, grid: newGrid, patrolRoutes: newRoutes });
        return;
      }
      newGrid[y][x] = { type: 'empty' };
    } else if (selectedTool === 'floor' || selectedTool === 'wall') {
      newGrid[y][x] = { type: selectedTool };
    } else if (selectedTool === 'monster') {
      const monster: Monster = {
        ...selectedMonster,
        id: `${selectedMonster.id}_${Date.now()}`,
        maxHp: selectedMonster.hp,
      };
      newGrid[y][x] = { type: 'monster', monster };
    } else if (selectedTool === 'trap') {
      const trap: Trap = {
        ...selectedTrap,
        id: `${selectedTrap.id}_${Date.now()}`,
      };
      newGrid[y][x] = { type: 'trap', trap };
    } else if (selectedTool === 'treasure') {
      const treasure: Treasure = {
        ...selectedTreasure,
        id: `${selectedTreasure.id}_${Date.now()}`,
      };
      newGrid[y][x] = { type: 'treasure', treasure };
    } else if (selectedTool === 'guard') {
      const guard: Guard = {
        ...selectedGuard,
        id: `guard_${Date.now()}`,
      };
      newGrid[y][x] = { type: 'guard', guard };
    }

    onChange({ ...level, grid: newGrid });
  };

  const handleRouteClick = (x: number, y: number) => {
    if (!drawingRouteGuardId) return;
    if (!isCellWalkable(level, x, y)) return;

    const existingRoute = level.patrolRoutes.find(r => r.guardId === drawingRouteGuardId);
    if (existingRoute) {
      const pos: Position = { x, y };
      if (!isAdjacentToRouteEnd(pos, existingRoute)) return;
      const already = existingRoute.waypoints.some(w => w.x === pos.x && w.y === pos.y);
      if (already) return;
      const newRoutes = level.patrolRoutes.map(r =>
        r.guardId === drawingRouteGuardId
          ? { ...r, waypoints: [...r.waypoints, pos] }
          : r
      );
      onChange({ ...level, patrolRoutes: newRoutes });
    } else {
      const newRoute: PatrolRoute = {
        guardId: drawingRouteGuardId,
        waypoints: [{ x, y }],
      };
      onChange({ ...level, patrolRoutes: [...level.patrolRoutes, newRoute] });
    }
  };

  const resizeLevel = (newWidth: number, newHeight: number) => {
    const newGrid = createEmptyGrid(newWidth, newHeight);
    const minWidth = Math.min(level.width, newWidth);
    const minHeight = Math.min(level.height, newHeight);

    for (let y = 0; y < minHeight; y++) {
      for (let x = 0; x < minWidth; x++) {
        newGrid[y][x] = { ...level.grid[y][x] };
      }
    }

    const startPos: Position = level.startPos.x < newWidth && level.startPos.y < newHeight
      ? level.startPos
      : { x: 0, y: 0 };
    const endPos: Position = level.endPos.x < newWidth && level.endPos.y < newHeight
      ? level.endPos
      : { x: newWidth - 1, y: newHeight - 1 };

    if (newGrid[startPos.y][startPos.x].type === 'empty') {
      newGrid[startPos.y][startPos.x] = { type: 'start' };
    }
    if (newGrid[endPos.y][endPos.x].type === 'empty') {
      newGrid[endPos.y][endPos.x] = { type: 'end' };
    }

    const validRoutes = level.patrolRoutes.filter(r =>
      r.waypoints.every(w => w.x < newWidth && w.y < newHeight)
    );

    onChange({ ...level, width: newWidth, height: newHeight, grid: newGrid, startPos, endPos, patrolRoutes: validRoutes });
  };

  const getCellContent = (cell: Cell): string => {
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

  const getCellBgColor = (cell: Cell, x: number, y: number): string => {
    const routeCell = isRouteCell(x, y);
    if (routeCell === 'current') return 'bg-cyan-700 ring-2 ring-cyan-400';
    if (routeCell === 'waypoint') return 'bg-cyan-900/60';

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

  const isRouteCell = (x: number, y: number): 'current' | 'waypoint' | null => {
    if (!drawingRouteGuardId) return null;
    const route = level.patrolRoutes.find(r => r.guardId === drawingRouteGuardId);
    if (!route) return null;
    const idx = route.waypoints.findIndex(w => w.x === x && w.y === y);
    if (idx === -1) return null;
    if (idx === route.waypoints.length - 1) return 'current';
    return 'waypoint';
  };

  const tools: { type: ToolType; label: string; emoji: string }[] = [
    { type: 'floor', label: '地板', emoji: '⬜' },
    { type: 'wall', label: '墙壁', emoji: '🧱' },
    { type: 'monster', label: '怪物', emoji: '👾' },
    { type: 'trap', label: '陷阱', emoji: '⚠️' },
    { type: 'treasure', label: '宝箱', emoji: '📦' },
    { type: 'guard', label: '守卫', emoji: '💂' },
    { type: 'patrol_route', label: '巡逻路线', emoji: '🔵' },
    { type: 'eraser', label: '橡皮擦', emoji: '🗑️' },
  ];

  const guardsOnMap: Guard[] = [];
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      if (level.grid[y][x].guard) {
        guardsOnMap.push(level.grid[y][x].guard!);
      }
    }
  }

  const currentRoute = drawingRouteGuardId
    ? level.patrolRoutes.find(r => r.guardId === drawingRouteGuardId)
    : null;

  const clearRoute = (guardId: string) => {
    const newRoutes = level.patrolRoutes.filter(r => r.guardId !== guardId);
    onChange({ ...level, patrolRoutes: newRoutes });
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="mb-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            宽度:
            <input
              type="number"
              min="5"
              max="20"
              value={level.width}
              onChange={(e) => resizeLevel(parseInt(e.target.value) || 5, level.height)}
              className="w-16 px-2 py-1 bg-gray-700 rounded text-white"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            高度:
            <input
              type="number"
              min="5"
              max="15"
              value={level.height}
              onChange={(e) => resizeLevel(level.width, parseInt(e.target.value) || 5)}
              className="w-16 px-2 py-1 bg-gray-700 rounded text-white"
            />
          </label>
          <button
            onClick={() => { setIsSettingStart(true); setIsSettingEnd(false); }}
            className={`px-3 py-1 rounded text-sm ${isSettingStart ? 'bg-green-500' : 'bg-gray-600 hover:bg-gray-500'}`}
          >
            🚪 设置起点
          </button>
          <button
            onClick={() => { setIsSettingEnd(true); setIsSettingStart(false); }}
            className={`px-3 py-1 rounded text-sm ${isSettingEnd ? 'bg-yellow-500' : 'bg-gray-600 hover:bg-gray-500'}`}
          >
            🏆 设置终点
          </button>
        </div>

        <div
          className="inline-grid gap-1 p-4 bg-gray-800 rounded-lg"
          style={{ gridTemplateColumns: `repeat(${level.width}, minmax(0, 1fr))` }}
        >
          {level.grid.map((row, y) =>
            row.map((cell, x) => (
              <button
                key={`${x}-${y}`}
                onClick={() => handleCellClick(x, y)}
                className={`w-10 h-10 flex items-center justify-center text-lg rounded transition-all hover:scale-105 hover:ring-2 ring-white/30 ${getCellBgColor(cell, x, y)} ${
                  isSettingStart || isSettingEnd || selectedTool === 'patrol_route' ? 'cursor-crosshair' : ''
                }`}
              >
                {getCellContent(cell)}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="w-72 space-y-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-bold mb-3">工具栏</h3>
          <div className="grid grid-cols-4 gap-2">
            {tools.map((tool) => (
              <button
                key={tool.type}
                onClick={() => {
                  setSelectedTool(tool.type);
                  setIsSettingStart(false);
                  setIsSettingEnd(false);
                  if (tool.type !== 'patrol_route') setDrawingRouteGuardId(null);
                }}
                className={`p-2 rounded text-center transition-all ${
                  selectedTool === tool.type
                    ? 'bg-blue-600 ring-2 ring-blue-400'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="text-xl">{tool.emoji}</div>
                <div className="text-xs text-gray-300 mt-1">{tool.label}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedTool === 'guard' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">选择守卫</h3>
            <div className="space-y-2">
              {GUARD_TEMPLATES.map((guard) => (
                <button
                  key={guard.id}
                  onClick={() => setSelectedGuard(guard)}
                  className={`w-full p-2 rounded flex items-center gap-3 transition-all ${
                    selectedGuard.id === guard.id
                      ? 'bg-indigo-700 ring-2 ring-indigo-400'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <span className="text-2xl">{guard.emoji}</span>
                  <div className="text-left text-sm">
                    <div className="text-white font-medium">{guard.name}</div>
                    <div className="text-gray-400 text-xs">
                      疲劳:{guard.fatigue} 视野:{guard.vision}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedTool === 'patrol_route' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">🔵 巡逻路线</h3>
            {guardsOnMap.length === 0 ? (
              <p className="text-gray-400 text-sm">请先放置守卫</p>
            ) : (
              <div className="space-y-2">
                {guardsOnMap.map((g) => {
                  const route = level.patrolRoutes.find(r => r.guardId === g.id);
                  const isSelected = drawingRouteGuardId === g.id;
                  return (
                    <div
                      key={g.id}
                      className={`p-2 rounded transition-all ${
                        isSelected ? 'bg-cyan-800 ring-2 ring-cyan-400' : 'bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setDrawingRouteGuardId(isSelected ? null : g.id)}
                          className="flex items-center gap-2 text-left"
                        >
                          <span className="text-xl">{g.emoji}</span>
                          <div>
                            <div className="text-white text-sm font-medium">{g.name}</div>
                            <div className="text-gray-400 text-xs">
                              路线: {route?.waypoints.length ?? 0} 格
                            </div>
                          </div>
                        </button>
                        {route && (
                          <button
                            onClick={() => clearRoute(g.id)}
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                          >
                            清除
                          </button>
                        )}
                      </div>
                      {isSelected && route && route.waypoints.length > 0 && (
                        <div className="mt-1 text-xs text-cyan-300">
                          路线长度: {route.waypoints.length} 步 | 点击相邻格子继续绘制
                        </div>
                      )}
                      {isSelected && (!route || route.waypoints.length === 0) && (
                        <div className="mt-1 text-xs text-cyan-300">
                          点击守卫旁边的格子开始绘制路线
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-3 p-2 bg-gray-700/50 rounded text-xs text-gray-400">
              <p>• 选择守卫后点击地图绘制路线</p>
              <p>• 路线必须从守卫相邻格开始</p>
              <p>• 每次只能点击上一格的相邻格</p>
            </div>
          </div>
        )}

        {selectedTool === 'monster' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">选择怪物</h3>
            <div className="space-y-2">
              {MONSTER_TEMPLATES.map((monster) => (
                <button
                  key={monster.id}
                  onClick={() => setSelectedMonster(monster)}
                  className={`w-full p-2 rounded flex items-center gap-3 transition-all ${
                    selectedMonster.id === monster.id
                      ? 'bg-red-700 ring-2 ring-red-400'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <span className="text-2xl">{monster.emoji}</span>
                  <div className="text-left text-sm">
                    <div className="text-white font-medium">{monster.name}</div>
                    <div className="text-gray-400 text-xs">
                      HP:{monster.hp} 攻:{monster.attack} 防:{monster.defense}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedTool === 'trap' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">选择陷阱</h3>
            <div className="space-y-2">
              {TRAP_TEMPLATES.map((trap) => (
                <button
                  key={trap.id}
                  onClick={() => setSelectedTrap(trap)}
                  className={`w-full p-2 rounded flex items-center gap-3 transition-all ${
                    selectedTrap.id === trap.id
                      ? 'bg-orange-700 ring-2 ring-orange-400'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <span className="text-2xl">{trap.emoji}</span>
                  <div className="text-left text-sm">
                    <div className="text-white font-medium">{trap.name}</div>
                    <div className="text-gray-400 text-xs">
                      伤害:{trap.damage} 效果:{trap.effect}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedTool === 'treasure' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">选择宝物</h3>
            <div className="space-y-2">
              {TREASURE_TEMPLATES.map((treasure) => (
                <button
                  key={treasure.id}
                  onClick={() => setSelectedTreasure(treasure)}
                  className={`w-full p-2 rounded flex items-center gap-3 transition-all ${
                    selectedTreasure.id === treasure.id
                      ? 'bg-amber-700 ring-2 ring-amber-400'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <span className="text-2xl">{treasure.emoji}</span>
                  <div className="text-left text-sm">
                    <div className="text-white font-medium">{treasure.name}</div>
                    <div className="text-gray-400 text-xs">
                      金币:{treasure.gold} {treasure.item ? `道具:${treasure.item}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {(isSettingStart || isSettingEnd) && (
          <div className="bg-blue-900 rounded-lg p-4 text-center">
            <p className="text-blue-200">
              {isSettingStart ? '点击格子设置起点' : '点击格子设置终点'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
