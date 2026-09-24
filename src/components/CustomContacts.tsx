import { MessagesSquare, Instagram, Link2, type LucideIcon } from 'lucide-react';

export interface CustomContact {
    id: string;
    type: string;
    value: string;
    is_public: boolean;
}

export const CONTACT_TYPES: { value: string; label: string; icon: LucideIcon }[] = [
    { value: 'discord', label: 'Discord', icon: MessagesSquare },
    { value: 'instagram', label: 'Instagram', icon: Instagram },
    { value: 'other', label: 'Sonstiges', icon: Link2 },
];

export function getContactType(type: string) {
    return CONTACT_TYPES.find(t => t.value === type) || CONTACT_TYPES[2];
}

export function newContactId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function publicCustomContacts(contacts?: CustomContact[] | null): CustomContact[] {
    if (!Array.isArray(contacts)) return [];
    return contacts.filter(c => c && c.is_public && typeof c.value === 'string' && c.value.trim().length > 0);
}

export function CustomContactsList({ contacts, className }: { contacts?: CustomContact[] | null; className?: string }) {
    const visible = publicCustomContacts(contacts);
    if (visible.length === 0) return null;
    return (
        <div className={`flex flex-wrap gap-2 ${className || ''}`}>
            {visible.map(c => {
                const { label, icon: Icon } = getContactType(c.type);
                return (
                    <span
                        key={c.id || `${c.type}-${c.value}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300"
                    >
                        <Icon size={13} aria-hidden="true" />
                        <span className="text-gray-400 dark:text-gray-500">{label}:</span>
                        <span>{c.value}</span>
                    </span>
                );
            })}
        </div>
    );
}
