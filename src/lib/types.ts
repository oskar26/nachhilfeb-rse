export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    first_name: string | null
                    last_name: string | null
                    display_name: string | null
                    grade_level: string | null
                    class_letter: string | null
                    role: 'student' | 'sv_admin' | 'parent'
                    subjects: string[]
                    bio: string | null
                    moodle_name: string | null
                    phone_number: string | null
                    contact_other: string | null
                    settings: Json | null
                    avatar_url: string | null
                    is_verified: boolean
                    sv_code_used: string | null
                    is_banned?: boolean
                    average_rating?: number
                    onboarding_complete: boolean
                    birth_date: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    first_name?: string | null
                    last_name?: string | null
                    display_name?: string | null
                    grade_level?: string | null
                    class_letter?: string | null
                    role?: 'student' | 'sv_admin' | 'parent'
                    subjects?: string[]
                    bio?: string | null
                    moodle_name?: string | null
                    phone_number?: string | null
                    contact_other?: string | null
                    settings?: Json | null
                    avatar_url?: string | null
                    is_verified?: boolean
                    sv_code_used?: string | null
                    is_banned?: boolean
                    average_rating?: number
                    onboarding_complete?: boolean
                    birth_date?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    first_name?: string | null
                    last_name?: string | null
                    display_name?: string | null
                    grade_level?: string | null
                    class_letter?: string | null
                    role?: 'student' | 'sv_admin' | 'parent'
                    subjects?: string[]
                    bio?: string | null
                    moodle_name?: string | null
                    phone_number?: string | null
                    contact_other?: string | null
                    settings?: Json | null
                    avatar_url?: string | null
                    is_verified?: boolean
                    sv_code_used?: string | null
                    is_banned?: boolean
                    average_rating?: number
                    onboarding_complete?: boolean
                    birth_date?: string | null
                    created_at?: string
                }
            }
            ads: {
                Row: {
                    id: string
                    user_id: string
                    type: 'offer' | 'search'
                    subjects: string[]
                    grade_levels: string[]
                    locations: string[]
                    custom_location: string | null
                    price_details: PriceDetails
                    duration_minutes: number[]
                    short_description: string | null
                    long_description: string | null
                    image_urls: string[]
                    is_active: boolean
                    boosted?: boolean
                    boosted_until?: string | null
                    promo_code_used?: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    type: 'offer' | 'search'
                    subjects?: string[]
                    grade_levels?: string[]
                    locations?: string[]
                    custom_location?: string | null
                    price_details?: PriceDetails
                    duration_minutes?: number[]
                    short_description?: string | null
                    long_description?: string | null
                    image_urls?: string[]
                    is_active?: boolean
                    boosted?: boolean
                    boosted_until?: string | null
                    promo_code_used?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    type?: 'offer' | 'search'
                    subjects?: string[]
                    grade_levels?: string[]
                    locations?: string[]
                    custom_location?: string | null
                    price_details?: PriceDetails
                    duration_minutes?: number[]
                    short_description?: string | null
                    long_description?: string | null
                    image_urls?: string[]
                    is_active?: boolean
                    boosted?: boolean
                    boosted_until?: string | null
                    promo_code_used?: string | null
                    created_at?: string
                }
            }
            valid_codes: {
                Row: {
                    code: string
                    role: string
                    is_used: boolean
                    used_by: string | null
                    created_by: string | null
                    created_at: string
                    expires_at: string | null
                }
            }
            ad_requests: {
                Row: {
                    id: string
                    ad_id: string
                    requester_id: string
                    owner_id: string
                    role: 'student_to_tutor' | 'tutor_to_student' | null // context
                    message: string | null
                    status: 'pending' | 'accepted' | 'rejected' | 'completed'
                    created_at: string
                }
                Insert: {
                    id?: string
                    ad_id: string
                    requester_id: string
                    owner_id: string
                    role?: 'student_to_tutor' | 'tutor_to_student' | null
                    message?: string | null
                    status?: 'pending' | 'accepted' | 'rejected' | 'completed'
                    created_at?: string
                }
                Update: {
                    id?: string
                    ad_id?: string
                    requester_id?: string
                    owner_id?: string
                    role?: 'student_to_tutor' | 'tutor_to_student' | null
                    message?: string | null
                    status?: 'pending' | 'accepted' | 'rejected' | 'completed'
                    created_at?: string
                }
            }
            reviews: {
                Row: {
                    id: string
                    ad_id: string | null
                    author_id: string
                    target_user_id: string
                    rating: number
                    comment: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    ad_id?: string | null
                    author_id: string
                    target_user_id: string
                    rating: number
                    comment?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    ad_id?: string | null
                    author_id?: string
                    target_user_id?: string
                    rating?: number
                    comment?: string | null
                    created_at?: string
                }
            }
            favorites: {
                Row: {
                    user_id: string
                    ad_id: string
                    created_at: string
                }
                Insert: {
                    user_id: string
                    ad_id: string
                    created_at?: string
                }
                Update: {
                    user_id?: string
                    ad_id?: string
                    created_at?: string
                }
            }
        }
    }
}

export interface PriceDetails {
    mode: 'free' | 'fixed' | 'vb'
    value: number | null
    unit?: string // "45min", "60min" etc.
}

export type Ad = Database['public']['Tables']['ads']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
