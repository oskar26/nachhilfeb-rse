import type { Availability } from '../AvailabilityCalendar';

export type ActivityKind = 'ad' | 'request' | 'review';

export interface ChildActivity {
    id: string;
    type: ActivityKind;
    title: string;
    description: string;
    timestamp: string;
}

export interface ChildStats {
    ads_count: number;
    requests_count: number;
    reviews_count: number;
    favorites_count: number;
}

export interface ChildProfile {
    id: string;
    full_name: string | null;
    display_name: string | null;
    first_name?: string | null;
    last_name?: string | null;
    grade_level: string | null;
    class_letter?: string | null;
    avatar_url: string | null;
    avatar_type?: string | null;
    banner_color?: string | null;
    bio?: string | null;
    subjects: string[];
    availability: Availability | null;
    settings: {
        email_visible?: boolean;
        phone_visible?: boolean;
        custom_contacts?: Array<{ label?: string; value?: string }>;
        availability?: Availability;
    };
    is_verified: boolean;
    onboarding_complete: boolean;
    average_rating: number;
    stats: ChildStats;
    recent_activity: ChildActivity[];
}

export interface ParentPermissions {
    can_view_ads: boolean;
    can_view_ratings: boolean;
    can_view_activity: boolean;
    can_receive_notifications: boolean;
}

export interface ParentLinkRecord {
    id: string;
    parent_id: string;
    child_id: string;
    status: string;
    permissions: Partial<ParentPermissions>;
    created_at: string;
    linked_at: string | null;
    child: ChildProfile;
}

export interface ChildView {
    linkId: string;
    linkedAt: string | null;
    permissions: ParentPermissions;
    profile: ChildProfile;
}
