import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APPOINTMENT_DURATION,
  DEFAULT_APPOINTMENT_LOCATION,
  addDaysToISODate,
  appointmentEndTime,
  appointmentSubjectFromRequest,
  buildAppointmentConfirmation,
  buildAppointmentDecline,
  buildAppointmentMessage,
  deriveAppointmentStatus,
  extractAppointments,
  formatAppointmentDate,
  formatAppointmentTime,
  isAppointmentInPast,
  isValidISODate,
  normalizeAppointmentSubject,
  parseAppointmentMessage,
  parseAppointmentResponse,
  todayISODate,
} from '../src/lib/chat-appointments';

const legacy = [
  'TERMIN-VEREINBARUNG',
  'Fach: Mathematik',
  'Datum: 2026-11-18',
  'Uhrzeit: 14:00 Uhr (45 Min)',
  'Ort: FWG Bibliothek / Schulgelände',
].join('\n');

describe('parseAppointmentMessage', () => {
  it('parses the existing appointment text format', () => {
    expect(parseAppointmentMessage(legacy)).toEqual({
      subject: 'Mathematik',
      date: '2026-11-18',
      time: '14:00',
      durationMinutes: 45,
      location: DEFAULT_APPOINTMENT_LOCATION,
    });
  });

  it('keeps German dates and custom durations readable', () => {
    const result = parseAppointmentMessage([
      'TERMIN-VEREINBARUNG',
      'Fach: Englisch',
      'Datum: 18.11.2026',
      'Uhrzeit: 15.30 Uhr (60 Minuten)',
      'Ort: SV-Raum',
      'Format: Vor Ort',
    ].join('\n'));

    expect(result).toEqual({
      subject: 'Englisch',
      date: '2026-11-18',
      time: '15:30',
      durationMinutes: 60,
      location: 'SV-Raum',
      format: 'Vor Ort',
    });
  });

  it('returns null for normal chat text and incomplete appointments', () => {
    expect(parseAppointmentMessage('Hallo, passt dir 14 Uhr?')).toBeNull();
    expect(parseAppointmentMessage('TERMIN-VEREINBARUNG\nFach: Mathe\nOrt: SV-Raum')).toBeNull();
    expect(parseAppointmentMessage('TERMIN-VEREINBARUNG\nDatum: 2026-02-31\nUhrzeit: 14:00')).toBeNull();
  });

  it('ignores text before the marker line', () => {
    const result = parseAppointmentMessage(`Schau mal:\n\n${legacy}`);
    expect(result?.date).toBe('2026-11-18');
  });
});

describe('buildAppointmentMessage', () => {
  it('writes the same format the old chat parser understands', () => {
    const content = buildAppointmentMessage({
      subject: 'Physik',
      date: '2026-12-02',
      time: '13:00',
      durationMinutes: 45,
      location: 'SV-Raum',
    });

    expect(content).toBe([
      'TERMIN-VEREINBARUNG',
      'Fach: Physik',
      'Datum: 2026-12-02',
      'Uhrzeit: 13:00 Uhr (45 Min)',
      'Ort: SV-Raum',
    ].join('\n'));
    expect(parseAppointmentMessage(content)?.subject).toBe('Physik');
  });

  it('omits an empty location and appends a format only when present', () => {
    const content = buildAppointmentMessage({
      subject: 'Deutsch',
      date: '2026-12-03',
      time: '16:00',
      durationMinutes: 30,
      format: 'Online',
    });

    expect(content).not.toContain('Ort:');
    expect(content).toContain('Format: Online');
    expect(content).toContain('(30 Min)');
  });
});

describe('appointment date helpers', () => {
  it('validates real calendar dates', () => {
    expect(isValidISODate('2026-11-18')).toBe(true);
    expect(isValidISODate('2026-02-31')).toBe(false);
    expect(isValidISODate('18.11.2026')).toBe(false);
  });

  it('adds days in local time without UTC drift', () => {
    expect(addDaysToISODate('2026-11-18', 1)).toBe('2026-11-19');
    expect(addDaysToISODate('2026-12-31', 1)).toBe('2027-01-01');
    expect(todayISODate(new Date(2026, 10, 15, 23, 59))).toBe('2026-11-15');
  });

  it('formats date and time ranges for the card', () => {
    const details = { date: '2026-11-18', time: '14:00', durationMinutes: 45 };
    expect(formatAppointmentDate(details.date, new Date(2026, 10, 15))).toBe('Mittwoch, 18. November');
    expect(formatAppointmentTime(details)).toBe('14:00–14:45 Uhr');
    expect(appointmentEndTime({ time: '23:45', durationMinutes: 45 })).toBe('00:30');
  });

  it('detects appointments in the past', () => {
    expect(isAppointmentInPast(
      { date: '2026-11-14', time: '10:00' },
      new Date(2026, 10, 15, 9, 0)
    )).toBe(true);
    expect(isAppointmentInPast(
      { date: '2026-11-15', time: '10:00' },
      new Date(2026, 10, 15, 9, 0)
    )).toBe(false);
  });
});

describe('appointment wording', () => {
  it('builds a normal confirmation message with a parseable marker', () => {
    expect(buildAppointmentConfirmation({
      subject: 'Mathematik',
      date: '2026-11-18',
      time: '14:00',
      durationMinutes: DEFAULT_APPOINTMENT_DURATION,
    })).toBe('✅ Passt: Mathematik am 18.11.2026, 14:00 Uhr.');
  });

  it('builds a normal decline message', () => {
    expect(buildAppointmentDecline({
      subject: 'Englisch',
      date: '2026-11-19',
      time: '15:00',
      durationMinutes: DEFAULT_APPOINTMENT_DURATION,
    })).toBe('❌ Passt nicht: Englisch am 19.11.2026, 15:00 Uhr. Bitte schlage einen anderen Termin vor.');
  });

  it('parses only its own marked response format', () => {
    expect(parseAppointmentResponse('✅ Passt: Mathematik am 18.11.2026, 14:00 Uhr.')).toEqual({
      status: 'accepted',
      subject: 'Mathematik',
      date: '2026-11-18',
      time: '14:00',
    });
    expect(parseAppointmentResponse('❌ Passt nicht: Mathematik am 18.11.2026, 14:00 Uhr.')?.status).toBe('declined');
    expect(parseAppointmentResponse('Ja, passt!')).toBeNull();
    expect(parseAppointmentResponse('✅ Passt: Mathe am 31.02.2026, 14:00 Uhr.')).toBeNull();
  });

  it('maps ad subjects onto dialog subjects', () => {
    expect(appointmentSubjectFromRequest(['mathe'])).toBe('Mathematik');
    expect(normalizeAppointmentSubject('english')).toBe('Englisch');
    expect(normalizeAppointmentSubject('Darstellendes Spiel')).toBe('Darstellendes Spiel');
    expect(normalizeAppointmentSubject('')).toBe('Mathematik');
  });
});

function appointmentMessage(id: string, sender: string, date: string, time: string, createdAt: string, subject = 'Mathematik') {
  return {
    id,
    sender_id: sender,
    created_at: createdAt,
    content: buildAppointmentMessage({ subject, date, time, durationMinutes: 45, location: 'SV-Raum' }),
  };
}

describe('local appointment status', () => {
  const proposal = appointmentMessage('a1', 'u-mia', '2026-11-18', '14:00', '2026-11-15T10:00:00');
  const details = {
    subject: 'Mathematik',
    date: '2026-11-18',
    time: '14:00',
    durationMinutes: 45,
    location: 'SV-Raum',
  };

  it('stays proposed without a marked answer', () => {
    expect(deriveAppointmentStatus('a1', [proposal])).toBe('proposed');
    expect(deriveAppointmentStatus('a1', [proposal, {
      id: 'a2', sender_id: 'u-lena', created_at: '2026-11-15T10:01:00', content: 'Ja, passt!',
    }])).toBe('proposed');
  });

  it('derives accepted and declined from later marked messages', () => {
    expect(deriveAppointmentStatus('a1', [proposal, {
      id: 'a2', sender_id: 'u-lena', created_at: '2026-11-15T10:01:00', content: buildAppointmentConfirmation(details),
    }])).toBe('accepted');
    expect(deriveAppointmentStatus('a1', [proposal, {
      id: 'a2', sender_id: 'u-lena', created_at: '2026-11-15T10:01:00', content: buildAppointmentDecline(details),
    }])).toBe('declined');
  });

  it('marks a later proposal for the same subject as countered', () => {
    const counter = appointmentMessage('a2', 'u-lena', '2026-11-19', '15:00', '2026-11-15T10:02:00');
    expect(deriveAppointmentStatus('a1', [proposal, counter])).toBe('countered');
    expect(deriveAppointmentStatus('a2', [proposal, counter])).toBe('proposed');
  });
});

describe('extractAppointments', () => {
  it('extracts, deduplicates and sorts upcoming appointments', () => {
    const now = new Date(2026, 10, 15, 9, 0);
    const first = appointmentMessage('a1', 'u-mia', '2026-11-18', '14:00', '2026-11-15T10:00:00');
    const duplicate = appointmentMessage('a2', 'u-mia', '2026-11-18', '14:00', '2026-11-15T10:01:00');
    const later = appointmentMessage('a3', 'u-lena', '2026-11-20', '15:00', '2026-11-15T10:02:00');
    const past = appointmentMessage('a4', 'u-mia', '2026-11-14', '14:00', '2026-11-14T10:00:00');

    const entries = extractAppointments([first, duplicate, later, past], now);

    expect(entries.map((entry) => entry.messageId)).toEqual(['a4', 'a1', 'a3']);
    expect(entries.map((entry) => entry.isUpcoming)).toEqual([false, true, true]);
    expect(entries[1].details.date).toBe('2026-11-18');
  });

  it('returns an empty list for normal chat messages', () => {
    expect(extractAppointments([{
      id: 'm1', sender_id: 'u-mia', created_at: '2026-11-15T10:00:00', content: 'Hallo',
    }])).toEqual([]);
  });
});
