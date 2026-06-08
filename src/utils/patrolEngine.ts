import { Level, Guard, PatrolRoute, PatrolNightRecord, PatrolVerificationResult, Position } from '../types/game';

const TOTAL_NIGHTS = 3;

function getVisibleCells(pos: Position, vision: number, level: Level): Position[] {
  const cells: Position[] = [];
  for (let dy = -vision; dy <= vision; dy++) {
    for (let dx = -vision; dx <= vision; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > vision) continue;
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (nx >= 0 && nx < level.width && ny >= 0 && ny < level.height) {
        const cell = level.grid[ny][nx];
        if (cell.type !== 'empty' && cell.type !== 'wall') {
          cells.push({ x: nx, y: ny });
        }
      }
    }
  }
  return cells;
}

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

export function simulatePatrolNight(
  guard: Guard,
  route: PatrolRoute,
  level: Level,
  night: number,
): PatrolNightRecord {
  const fatigueForNight = Math.max(1, guard.fatigue - (night - 1));
  const visitedCells: Position[] = [];
  const seenSet = new Set<string>();

  const startCell = findGuardPosition(guard.id, level);
  if (!startCell) {
    return {
      night,
      guardId: guard.id,
      visitedCells: [],
      seenCells: [],
      fatigueUsed: 0,
      fatigueTotal: fatigueForNight,
      stoppedEarly: false,
    };
  }

  visitedCells.push(startCell);
  for (const cell of getVisibleCells(startCell, guard.vision, level)) {
    seenSet.add(posKey(cell));
  }

  let fatigueUsed = 0;
  let stoppedEarly = false;

  for (let i = 0; i < route.waypoints.length; i++) {
    if (fatigueUsed >= fatigueForNight) {
      stoppedEarly = true;
      break;
    }
    const wp = route.waypoints[i];
    visitedCells.push(wp);
    for (const cell of getVisibleCells(wp, guard.vision, level)) {
      seenSet.add(posKey(cell));
    }
    fatigueUsed++;
  }

  return {
    night,
    guardId: guard.id,
    visitedCells,
    seenCells: Array.from(seenSet).map(k => {
      const [x, y] = k.split(',').map(Number);
      return { x, y };
    }),
    fatigueUsed,
    fatigueTotal: fatigueForNight,
    stoppedEarly,
  };
}

function findGuardPosition(guardId: string, level: Level): Position | null {
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      if (level.grid[y][x].guard?.id === guardId) {
        return { x, y };
      }
    }
  }
  return null;
}

function collectAllPatrolCells(level: Level): Position[] {
  const cellSet = new Set<string>();
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      const cell = level.grid[y][x];
      if (cell.type !== 'empty' && cell.type !== 'wall') {
        cellSet.add(posKey({ x, y }));
      }
    }
  }
  return Array.from(cellSet).map(k => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  });
}

export function runPatrolVerification(level: Level): PatrolVerificationResult {
  const allPatrolCells = collectAllPatrolCells(level);
  const totalPatrolCells = allPatrolCells.length;
  const allNights: PatrolNightRecord[] = [];
  const guardResults: PatrolVerificationResult['guardResults'] = [];

  for (const route of level.patrolRoutes) {
    const guard = findGuard(route.guardId, level);
    if (!guard) continue;

    let totalVisited = 0;
    let totalSeen = 0;
    let nightsCompleted = 0;
    const visitedSet = new Set<string>();
    const seenSet = new Set<string>();

    for (let night = 1; night <= TOTAL_NIGHTS; night++) {
      const record = simulatePatrolNight(guard, route, level, night);
      allNights.push(record);

      if (!record.stoppedEarly) nightsCompleted++;

      for (const v of record.visitedCells) {
        const k = posKey(v);
        if (!visitedSet.has(k)) {
          visitedSet.add(k);
          totalVisited++;
        }
      }
      for (const s of record.seenCells) {
        const k = posKey(s);
        if (!seenSet.has(k)) {
          seenSet.add(k);
          totalSeen++;
        }
      }
    }

    guardResults.push({
      guardId: guard.id,
      guardName: guard.name,
      nightsCompleted,
      totalVisited,
      totalSeen,
    });
  }

  const coveredSet = new Set<string>();
  for (const record of allNights) {
    for (const v of record.visitedCells) coveredSet.add(posKey(v));
    for (const s of record.seenCells) coveredSet.add(posKey(s));
  }

  const missedCells = allPatrolCells.filter(p => !coveredSet.has(posKey(p)));
  const missedCount = missedCells.length;
  const coveragePercent = totalPatrolCells > 0
    ? Math.round(((totalPatrolCells - missedCount) / totalPatrolCells) * 100)
    : 100;

  return {
    nights: allNights,
    totalPatrolCells,
    missedCells,
    missedCount,
    coveragePercent,
    guardResults,
  };
}

function findGuard(guardId: string, level: Level): Guard | null {
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      if (level.grid[y][x].guard?.id === guardId) {
        return level.grid[y][x].guard!;
      }
    }
  }
  return null;
}

export function isAdjacentToRouteEnd(pos: Position, route: PatrolRoute): boolean {
  if (route.waypoints.length === 0) return true;
  const last = route.waypoints[route.waypoints.length - 1];
  const dx = Math.abs(pos.x - last.x);
  const dy = Math.abs(pos.y - last.y);
  return (dx + dy) === 1;
}

export function isCellWalkable(level: Level, x: number, y: number): boolean {
  if (x < 0 || x >= level.width || y < 0 || y >= level.height) return false;
  const cell = level.grid[y][x];
  return cell.type !== 'empty' && cell.type !== 'wall';
}
