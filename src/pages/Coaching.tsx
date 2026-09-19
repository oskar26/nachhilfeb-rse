import { useState, useEffect } from 'react';
import { ChevronLeft, Award, ClipboardCheck, Scale, Megaphone, HeartHandshake, Gavel, Mail, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';

function RuleCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-11 h-11 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-4">
                {icon}
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{title}</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">{children}</div>
        </div>
    );
}

// Fallback-Texte (identisch zu den Backend-Defaults), falls die CMS-Texte nicht laden.
const FALLBACK: Record<string, string> = {
    hero_title: 'Schüler-Coaching am FWG',
    hero_subtitle: 'Große helfen Kleinen: Geschulte Schülerinnen und Schüler ab Klasse 8 unterstützen die Klassen 5 und 6 beim Ankommen am Friedrich-Wilhelms-Gymnasium Köln – ehrenamtlich, pädagogisch begleitet und für alle nach denselben fairen Regeln.',
    s_badge_title: 'Was bedeutet das Coach-Abzeichen?',
    s_badge_body: 'Das goldene Coach-Badge auf Profilen und Anzeigen zeigt: Diese Person ist aktives Mitglied der Schüler-Coaching AG, wurde von der AG-Leitung geschult und vom SV-Team verifiziert.\n\nDas Badge steht für Vertrauenswürdigkeit als Person – nicht für Erfolgsgarantien und nicht für kostenlose Nachhilfe. Preise und Absprachen bleiben Sache der Beteiligten (siehe Nutzungsbedingungen).',
    s_school_title: 'Das Coaching an unserer Schule',
    s_school_body: 'Das Schüler-Coaching ist ein schulisches Angebot des FWG: Jede Woche dienstags von 13:45–14:30 Uhr in Raum H310 helfen geschulte Schülerinnen und Schüler der 8. Klassen den 5. und 6. Klassen – bei einzelnen Fächern oder der Lern- und Arbeitsorganisation allgemein. Die Coaches werden jeweils vor den Herbstferien geschult und engagieren sich ehrenamtlich bis zum Ende des Schuljahres. Dieses Angebot wird in der Regel sehr gerne angenommen, da die Coaches einen guten Blick auf die Probleme der jüngeren Schülerinnen und Schüler haben.\n\nMehr dazu auf der Schul-Website: fwg-koeln.de/lebendige-schule/foerdern-und-fordern/coaching. Diese Nachhilfebörse der SV ergänzt das Angebot: Hier finden alle Jahrgangsstufen individuelle Nachhilfe – die Coaches der AG sind dabei besonders sichtbar, damit man sie leicht findet.',
    s_who_title: 'Wer kann Coach werden?',
    s_who_body: '• Schülerin oder Schüler des FWG ab Klasse 8\n• Teilnahme an der Coach-Schulung der AG-Leitung\n• Zuverlässigkeit und respektvoller Umgang – auch auf der Plattform\n• Verifizierter Account auf der Nachhilfebörse\n\nInteressiert? Wende dich an Frau Balistreri oder sprich das SV-Team im SV-Raum an.',
    s_boost_title: 'Warum stehen manche Anzeigen oben?',
    s_boost_body: 'Anzeigen mit dem Hinweis „Hervorgehoben“ erhalten eine bessere Platzierung und eine gelbe Markierung – ausschließlich bei Coach-Status (30 Tage nach Coaching-Code) oder SV-Aktionen.\n\nSichtbarkeit ist bei uns nicht käuflich: Es gibt keine bezahlten Boosts und keine Werbung.',
    s_fair_title: 'Gleiche Chancen für alle',
    s_fair_body: '• Jede Schülerin und jeder Schüler kann kostenlos Anzeigen erstellen – mit oder ohne Badge.\n• Codes sind personenbezogen und begrenzt und werden nur nach Schulung vergeben.\n• Die Vergabe wird protokolliert und kann vom SV-Team geprüft werden.',
    s_conduct_title: 'Verhalten als Coach',
    s_conduct_body: '• Respektvoller, geduldiger Umgang – besonders mit jüngeren Schülern\n• Keine falschen Versprechen (z. B. garantierte Notenverbesserung)\n• Treffen möglichst in der Schule; private Treffen nur mit Wissen der Eltern\n• Bei Problemen: frühzeitig die AG-Leitung oder das SV-Team ansprechen',
    s_revoke_title: 'Entzug des Status & Widerspruch',
    s_revoke_body: 'Bei Verstößen gegen diese Regeln oder die Nutzungsbedingungen kann die AG-Leitung oder das SV-Team den Coach-Status entziehen – mit kurzer Begründung direkt in der App oder per E-Mail.\n\nDagegen kannst du Widerspruch einlegen: Schreibe an info@nachhilfe-sv.de oder komme im SV-Raum vorbei. Das SV-Team prüft jeden Fall erneut.',
    contact_text: 'AG-Leitung: Frau Balistreri · SV-Lehrer: Herr Schulz, Herr Steinberg',
};

// Einfaches Auto-Link für fwg-koeln.de in Fließtext-Absätzen
function linkify(text: string) {
    const parts = text.split(/(fwg-koeln\.de(?:\/\S*)?)/g);
    return parts.map((p, i) =>
        /^fwg-koeln\.de/.test(p)
            ? <a key={i} href={`https://${p}`} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">{p}</a>
            : <span key={i}>{p}</span>
    );
}

// Absätze (Leerzeile) → <p>; Aufzählungs-Blöcke (Zeilen mit •) → <ul>
function renderBody(body: string) {
    const blocks = body.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    return blocks.map((block, i) => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 0 && lines.every(l => l.startsWith('•'))) {
            return (
                <ul key={i} className="list-disc pl-4 space-y-1">
                    {lines.map((l, j) => <li key={j}>{linkify(l.replace(/^•\s*/, ''))}</li>)}
                </ul>
            );
        }
        return <p key={i}>{linkify(block)}</p>;
    });
}

export default function Coaching() {
    const navigate = useNavigate();
    const [content, setContent] = useState<Record<string, string>>(FALLBACK);

    useEffect(() => {
        let cancelled = false;
        api.coach.getCoachingPage()
            .then(res => {
                if (!cancelled && res?.data && typeof res.data === 'object') {
                    setContent({ ...FALLBACK, ...res.data });
                }
            })
            .catch(() => { /* Fallback-Texte bleiben */ });
        return () => { cancelled = true; };
    }, []);

    const sections = [
        { icon: <Award size={22} />, title: content.s_badge_title, body: content.s_badge_body },
        { icon: <School size={22} />, title: content.s_school_title, body: content.s_school_body },
        { icon: <ClipboardCheck size={22} />, title: content.s_who_title, body: content.s_who_body },
        { icon: <Megaphone size={22} />, title: content.s_boost_title, body: content.s_boost_body },
        { icon: <Scale size={22} />, title: content.s_fair_title, body: content.s_fair_body },
        { icon: <HeartHandshake size={22} />, title: content.s_conduct_title, body: content.s_conduct_body },
        { icon: <Gavel size={22} />, title: content.s_revoke_title, body: content.s_revoke_body },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
                    <ChevronLeft className="mr-2" /> Zurück
                </Button>

                <div className="text-center space-y-4 mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                        <Award size={14} className="text-amber-500" />
                        Fairness-Regeln der Schüler-Coaching AG
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">{content.hero_title}</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        {content.hero_subtitle}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {sections.map(s => (
                        <RuleCard key={s.title} icon={s.icon} title={s.title}>
                            {renderBody(s.body)}
                        </RuleCard>
                    ))}
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-11 h-11 bg-primary/10 text-primary-hover rounded-2xl flex items-center justify-center shrink-0">
                        <Mail size={22} />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <h3 className="font-bold text-gray-900 dark:text-white">Fragen zum Coaching?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {content.contact_text} · E-Mail: <a href="mailto:Rosalia.Balistreri@fwg-koeln.nrw.schule" className="font-bold text-primary hover:underline">Rosalia.Balistreri@fwg-koeln.nrw.schule</a>
                        </p>
                    </div>
                    <Button onClick={() => navigate('/eltern-leitfaden')} variant="outline" className="rounded-full shrink-0">
                        Zum Eltern-Leitfaden
                    </Button>
                </div>

                <div className="text-center text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} Schülervertretung des Friedrich-Wilhelms-Gymnasiums Köln
                </div>
            </div>
        </div>
    );
}
