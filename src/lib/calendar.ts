/**
 * Generates and downloads a standard .ics calendar file for iCal, Google Calendar, Outlook
 */
export function downloadICSFile({
    title,
    description,
    location = 'Friedrich-Wilhelms-Gymnasium Köln',
    startDate,
    durationMinutes = 45,
}: {
    title: string;
    description: string;
    location?: string;
    startDate: Date;
    durationMinutes?: number;
}) {
    const formatDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//FWG Nachhilfebörse//DE',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `SUMMARY:${title}`,
        `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
        `LOCATION:${location}`,
        `DTSTART:${formatDate(startDate)}`,
        `DTEND:${formatDate(endDate)}`,
        `STATUS:CONFIRMED`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `fwg_nachhilfe_${startDate.toISOString().slice(0, 10)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
