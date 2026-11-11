import { Mail, MapPin, Building2, Newspaper, Phone } from 'lucide-react';
import StaticLayout from '../components/StaticLayout';

export default function Impressum() {
    return (
        <StaticLayout
            title="Impressum"
            intro="Stand: Oktober 2026 · Betreiber: SV FWG Köln · Anbieterkennzeichnung nach § 5 Digitale-Dienste-Gesetz (DDG)."
        >
            <div className="mx-auto max-w-3xl space-y-6 px-4 pb-16 sm:px-6">
                <div className="space-y-6 rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-soft sm:p-8">
                    <div className="flex gap-4">
                        <Building2 className="mt-1 shrink-0 text-brand-ink dark:text-primary" size={24} aria-hidden="true" />
                        <div className="min-w-0">
                            <h2 className="mb-2 text-lg font-semibold text-foreground">Diensteanbieter</h2>
                            <p className="text-base leading-7 text-muted-foreground">
                                Schülervertretung (SV) des<br />
                                <strong>Friedrich-Wilhelm-Gymnasiums Köln</strong><br />
                                Severinstraße 241<br />
                                50676 Köln<br />
                                Deutschland
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Mail className="mt-1 shrink-0 text-brand-ink dark:text-primary" size={24} aria-hidden="true" />
                        <div className="min-w-0">
                            <h2 className="mb-2 text-lg font-semibold text-foreground">Kontakt</h2>
                            <ul className="space-y-1 text-base leading-7 text-muted-foreground">
                                <li>
                                    E-Mail (SV-Team &amp; Nachhilfebörse):{' '}
                                    <a href="mailto:info@nachhilfe-sv.de" className="break-anywhere font-bold text-brand-ink hover:underline dark:text-primary">info@nachhilfe-sv.de</a>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Phone size={16} className="mt-1.5 shrink-0" aria-hidden="true" />
                                    <span>Telefon: <strong>[Telefon: wird ergänzt]</strong></span>
                                </li>
                                <li>
                                    Schüler-Coaching:{' '}
                                    <a href="mailto:Rosalia.Balistreri@fwg-koeln.nrw.schule" className="break-anywhere font-bold text-brand-ink hover:underline dark:text-primary">Rosalia.Balistreri@fwg-koeln.nrw.schule</a>{' '}
                                    (Frau Balistreri)
                                </li>
                                <li>
                                    Technik &amp; Fehlermeldungen:{' '}
                                    <a href="mailto:technik@nachhilfe-sv.de" className="break-anywhere font-bold text-brand-ink hover:underline dark:text-primary">technik@nachhilfe-sv.de</a>
                                </li>
                            </ul>
                            <p className="mt-2 text-base leading-7 text-muted-foreground">
                                Die Nachhilfebörse ist ein nicht-kommerzielles Schülerprojekt der SV.
                                Ansprechpartner für Inhalte dieser Plattform ist das SV-Team.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <MapPin className="mt-1 shrink-0 text-brand-ink dark:text-primary" size={24} aria-hidden="true" />
                        <div className="min-w-0">
                            <h2 className="mb-2 text-lg font-semibold text-foreground">Schulträger</h2>
                            <p className="text-base leading-7 text-muted-foreground">
                                Stadt Köln – Amt für Schulentwicklung<br />
                                Die Schule in Trägerschaft der Stadt Köln ist eine öffentliche Einrichtung
                                des Landes Nordrhein-Westfalen.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Newspaper className="mt-1 shrink-0 text-brand-ink dark:text-primary" size={24} aria-hidden="true" />
                        <div className="min-w-0">
                            <h2 className="mb-2 text-lg font-semibold text-foreground">Verantwortlich für redaktionelle Inhalte (§ 18 Abs. 2 MStV)</h2>
                            <p className="text-base leading-7 text-muted-foreground">
                                <strong>[Name, Funktion: wird ergänzt]</strong>, für das SV-Team des
                                Friedrich-Wilhelm-Gymnasiums Köln,<br />
                                Severinstraße 241, 50676 Köln.
                            </p>
                            <p className="mt-3 text-base leading-7 text-muted-foreground">
                                Für <strong>nutzergenerierte Inhalte</strong> (Anzeigen, Profile, Nachrichten)
                                sind die jeweiligen Nutzerinnen und Nutzer verantwortlich. Das SV-Team prüft
                                gemeldete Inhalte und entfernt rechtswidrige Inhalte nach Kenntnis
                                unverzüglich (siehe Nutzungsbedingungen und Meldefunktion in der App).
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-border bg-muted/60 p-6 text-sm leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Hinweis zum Charakter der Plattform:</strong>{' '}
                    Dies ist eine schulische Vermittlungsplattform von Schülern für Schüler.
                    Nachhilfevereinbarungen (Zeiten, Preise, Inhalte) kommen ausschließlich zwischen den
                    jeweiligen Nutzerinnen und Nutzern zustande – das SV-Team ist daran nicht beteiligt
                    und übernimmt dafür keine Gewähr (Details in den Nutzungsbedingungen).
                </div>
            </div>
        </StaticLayout>
    );
}
