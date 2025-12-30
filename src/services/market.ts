
import { supabase } from '@/src/lib/supabase';

export interface MarketOffer {
    id: string;
    user_id: string;
    type: 'OFFER' | 'REQUEST';
    currency_from: string;
    currency_to: string;
    amount: number;
    min_amount?: number;
    rate?: number;
    payment_methods: string[];
    wilaya?: string;
    commune?: string;
    expires_at?: string;
    status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'DELETED';
    contact_info_hidden: boolean;
    contact_preference: 'email' | 'phone' | 'both';
    phone_number?: string;
    settled_request_id?: string;
    created_at: string;
    requests_count?: number; // Added for UI counters
    requests?: any[]; // Joined relation
    user_profile?: { // Joined
        email: string;
        phone?: string;
    }
}

export const fetchActiveOffers = async (): Promise<MarketOffer[]> => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('market_offers')
        .select(`
            *,
            user_profile:profiles(email, phone),
            requests:market_requests!market_requests_offer_id_fkey(status)
        `)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching offers", error);
        throw error;
    }

    // Mask emails on client side just in case (though should be done in SQL/Edge Function for strictness)
    return data.map((offer: any) => ({
        ...offer,
        requests_count: offer.requests ? offer.requests.filter((r: any) => r.status === 'PENDING').length : 0,
        user_profile: offer.user_profile ? {
            email: maskEmail(offer.user_profile.email)
        } : undefined
    }));
};

export const createOffer = async (offer: Partial<MarketOffer>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in");

    const { user_profile, ...offerData } = offer; // Strip joined fields

    const { error } = await supabase
        .from('market_offers')
        .insert({
            ...offerData as any,
            user_id: user.id
        });

    if (error) throw error;
};

export const updateOffer = async (id: string, updates: Partial<MarketOffer>) => {
    // Explicitly strip fields that should not/cannot be updated
    const {
        id: _id,
        user_id: _uid,
        created_at: _createdAt,
        user_profile: _profile,
        requests: _requests,
        requests_count: _count,
        ...cleanUpdates
    } = updates;

    // Redundant safety check to ensure requests/requests_count are absolutely gone
    const payload = { ...cleanUpdates };
    if ('requests' in payload) delete (payload as any).requests;
    if ('requests_count' in payload) delete (payload as any).requests_count;
    if ('user_profile' in payload) delete (payload as any).user_profile;

    const { error } = await (supabase
        .from('market_offers') as any)
        .update(payload)
        .eq('id', id);
    if (error) throw error;
};

export const deleteOffer = async (id: string) => {
    console.log(id)
    const { error } = await supabase
        .from('market_offers')
        .delete()
        .eq('id', id);
    if (error) {
        console.error("Delete offer error:", error);
        throw error;
    }
};

// New function: Delete (Cancel) Request
export const deleteRequest = async (id: string) => {
    const { error } = await supabase
        .from('market_requests')
        .delete()
        .eq('id', id);
    if (error) {
        console.error("Delete request error:", error);
        throw error;
    }
};

export interface MarketRequest {
    id: string;
    offer_id: string;
    requester_id: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    proposed_rate: number;
    proposed_amount: number;
    proposed_location: string;
    payment_method: string;
    created_at: string;
    offer?: MarketOffer & {
        user_profile?: {
            email: string;
            phone?: string;
        }
    };
    requester_profile?: {
        email: string;
        phone?: string;
    };
}

export const createRequest = async (request: Partial<MarketRequest>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in");

    const { offer, requester_profile, ...requestData } = request; // Strip joined fields

    const { data: newRequest, error } = await supabase
        .from('market_requests')
        .insert({
            ...requestData,
            requester_id: user.id
        } as any)
        ;
    if (error) throw error;
};

export const fetchIncomingRequests = async (): Promise<MarketRequest[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Fetch requests for offers I own
    const { data, error } = await supabase
        .from('market_requests')
        .select(`
            *,
            offer:market_offers!market_requests_offer_id_fkey!inner(*),
            requester_profile:profiles(email, phone)
        `)
        .eq('offer.user_id', user.id)
        .neq('status', 'DELETED') // Filter out deleted
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching incoming requests", error);
        return [];
    }

    // Mask/Unmask logic
    return data.map((req: any) => {
        const isAccepted = req.status === 'ACCEPTED';
        const email = req.requester_profile?.email;
        const phone = req.requester_profile?.phone;

        return {
            ...req,
            requester_profile: req.requester_profile ? {
                email: isAccepted ? email : maskEmail(email),
                phone: isAccepted ? phone : (phone ? maskPhone(phone) : undefined)
            } : undefined
        };
    });
};

export const fetchOutgoingRequests = async (): Promise<MarketRequest[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('market_requests')
        .select(`
            *,
            offer:market_offers!market_requests_offer_id_fkey(
                *,
                user_profile:profiles(email, phone)
            )
        `)
        .eq('requester_id', user.id)
        .neq('status', 'DELETED') // Filter out deleted
        .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((req: any) => {
        const isAccepted = req.status === 'ACCEPTED';
        const offer = req.offer;
        const profile = offer?.user_profile;

        return {
            ...req,
            offer: offer ? {
                ...offer,
                user_profile: profile ? {
                    email: isAccepted ? profile.email : maskEmail(profile.email),
                    phone: isAccepted ? profile.phone : (profile.phone ? maskPhone(profile.phone) : undefined)
                } : undefined
            } : undefined
        };
    });
};

export const updateRequestStatus = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    const { error } = await (supabase
        .from('market_requests') as any)
        .update({ status })
        .eq('id', id);
    if (error) throw error;
};

// Helper: Mask email "mokhtar@gmail.com" -> "mok****"
function maskEmail(email: string): string {
    if (!email) return 'User';
    const [name, domain] = email.split('@');
    if (name.length <= 3) return `${name}***`;
    return `${name.substring(0, 3)}****`;
}

function maskPhone(phone: string): string {
    if (!phone) return 'Unknown';
    if (phone.length < 6) return '****';
    return `${phone.substring(0, 3)}****${phone.slice(-2)}`;
}
