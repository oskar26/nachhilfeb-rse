import {
    Megaphone,
    FlaskConical,
    PartyPopper,
    Star,
    Info,
    Siren,
    BookOpen,
    Trophy,
    type LucideIcon,
} from 'lucide-react';

export interface NewsIconOption {
    name: string;
    label: string;
    Icon: LucideIcon;
}

export const NEWS_ICONS: NewsIconOption[] = [
    { name: 'megaphone', label: 'Ankündigung', Icon: Megaphone },
    { name: 'flask', label: 'Neues / Experiment', Icon: FlaskConical },
    { name: 'party', label: 'Feier', Icon: PartyPopper },
    { name: 'star', label: 'Highlight', Icon: Star },
    { name: 'info', label: 'Info', Icon: Info },
    { name: 'alert', label: 'Wichtig', Icon: Siren },
    { name: 'book', label: 'Lernen', Icon: BookOpen },
    { name: 'trophy', label: 'Erfolg', Icon: Trophy },
];

// Altdaten (freie Emoji-Eingabe) weiter lesbar machen
const LEGACY_EMOJI: Record<string, string> = {
    '📢': 'megaphone',
    '🧪': 'flask',
    '🎉': 'party',
    '🌟': 'star',
    'ℹ️': 'info',
    '🚨': 'alert',
    '📚': 'book',
    '🏆': 'trophy',
};

export function resolveNewsIcon(value: string | null | undefined): LucideIcon {
    const v = (value || '').trim();
    const name = LEGACY_EMOJI[v] || v;
    return NEWS_ICONS.find((i) => i.name === name)?.Icon || Megaphone;
}

interface NewsIconProps {
    value: string | null | undefined;
    size?: number;
    className?: string;
}

export default function NewsIcon({ value, size = 20, className }: NewsIconProps) {
    const Icon = resolveNewsIcon(value);
    return <Icon size={size} className={className} />;
}
