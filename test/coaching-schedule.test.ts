import { describe, expect, it } from 'vitest';
import {
  appendScheduleDay,
  appendScheduleRow,
  createDefaultCoachingDocument,
  resizeScheduleRows,
  setScheduleCellText,
  type CoachingScheduleDay,
  type CoachingSupportBlock,
} from '../src/pages/Coaching';

function supportBlock(): CoachingSupportBlock {
  const block = createDefaultCoachingDocument().blocks.find(candidate => candidate.type === 'support');
  if (!block || block.type !== 'support') throw new Error('Standard-Förderunterricht fehlt');
  return structuredClone(block);
}

describe('resizeScheduleRows', () => {
  it('keeps the ids of existing cells when adding a column', () => {
    const block = supportBlock();
    const originalIds = block.rows[0].cells.map(cell => cell.id);
    const days: CoachingScheduleDay[] = [...block.days, { id: 'day-friday', label: 'Freitag' }];

    const resized = resizeScheduleRows(days, block.rows);

    expect(resized[0].cells).toHaveLength(days.length);
    expect(resized[0].cells.slice(0, originalIds.length).map(cell => cell.id)).toEqual(originalIds);
    expect(resized[0].cells[originalIds.length]).toMatchObject({ text: '' });
  });

  it('keeps the ids of the remaining cells when removing a column', () => {
    const block = supportBlock();
    const days = block.days.slice(0, 2);
    const originalIds = block.rows[0].cells.slice(0, 2).map(cell => cell.id);

    const resized = resizeScheduleRows(days, block.rows);

    expect(resized[0].cells.map(cell => cell.id)).toEqual(originalIds);
  });

  it('creates unique ids for new cells', () => {
    const block = supportBlock();
    const days: CoachingScheduleDay[] = [...block.days, { id: 'day-friday', label: 'Freitag' }];

    const resized = resizeScheduleRows(days, block.rows);
    const ids = resized.flatMap(row => row.cells.map(cell => cell.id));

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('appendScheduleDay', () => {
  it('appends a day and keeps existing cell ids aligned', () => {
    const block = supportBlock();
    const originalCellIds = block.rows.map(row => row.cells.map(cell => cell.id));

    const next = appendScheduleDay(block);

    expect(next.days).toHaveLength(block.days.length + 1);
    expect(next.days.at(-1)).toMatchObject({ label: 'Neuer Tag' });
    next.rows.forEach((row, rowIndex) => {
      expect(row.cells).toHaveLength(next.days.length);
      expect(row.cells.slice(0, originalCellIds[rowIndex].length).map(cell => cell.id))
        .toEqual(originalCellIds[rowIndex]);
    });
    expect(block.days).toHaveLength(block.days.length);
  });
});

describe('appendScheduleRow', () => {
  it('adds an empty row for every current day', () => {
    const block = supportBlock();
    const next = appendScheduleRow(block);

    expect(next.rows).toHaveLength(block.rows.length + 1);
    const row = next.rows.at(-1);
    expect(row?.time).toBe('');
    expect(row?.cells).toHaveLength(block.days.length);
    expect(row?.cells.every(cell => cell.text === '')).toBe(true);
    expect(new Set(row?.cells.map(cell => cell.id)).size).toBe(block.days.length);
  });

  it('does not add a row without days', () => {
    const block = supportBlock();
    const empty = { ...block, days: [], rows: [] };

    expect(appendScheduleRow(empty)).toBe(empty);
  });
});

describe('setScheduleCellText', () => {
  it('updates only the requested cell', () => {
    const block = supportBlock();
    const row = block.rows[0];
    const otherIds = row.cells.slice(1).map(cell => cell.id);

    const next = setScheduleCellText(block, row.id, 0, 'Deutsch');
    const updated = next.rows[0];

    expect(updated.cells[0]).toMatchObject({ id: row.cells[0].id, text: 'Deutsch' });
    expect(updated.cells.slice(1).map(cell => cell.id)).toEqual(otherIds);
    expect(block.rows[0].cells[0].text).toBe(row.cells[0].text);
  });

  it('fills missing cells before writing the target index', () => {
    const block = supportBlock();
    const row = block.rows[0];
    const shortRow = { ...row, cells: row.cells.slice(0, 1) };
    const withShortRow = { ...block, rows: [shortRow] };

    const next = setScheduleCellText(withShortRow, row.id, 2, 'Mathe');

    expect(next.rows[0].cells).toHaveLength(3);
    expect(next.rows[0].cells[0].id).toBe(row.cells[0].id);
    expect(next.rows[0].cells[2].text).toBe('Mathe');
  });
});
