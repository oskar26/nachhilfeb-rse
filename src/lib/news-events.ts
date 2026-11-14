// Kleiner, dependency-freier Event-Bus für News-Statusänderungen.
// Liegt bewusst außerhalb der Komponenten, damit Popup, Feed-Karte und
// Einstellungen denselben Event-Namen nutzen können, ohne UI-Module zu
// importieren oder einen Zyklus zu erzeugen.

export const NEWS_STATE_EVENT = 'fwg:news-state-changed';

export function notifyNewsStateChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(NEWS_STATE_EVENT));
}
