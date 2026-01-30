import { supabase } from '@/lib/supabase';

export type VoteType = 'BULLISH' | 'BEARISH';

export interface SentimentStats {
    bullishCount: number;
    bearishCount: number;
    totalVotes: number;
    userVote: VoteType | null;
}

export const fetchSentiment = async (currency: string = 'EUR'): Promise<SentimentStats> => {
    const today = new Date().toISOString().split('T')[0];
    const { data: { user } } = await supabase.auth.getUser();

    // Parallelize queries: 1. Aggregates, 2. User's vote
    const [statsResult, userVoteResult] = await Promise.all([
        supabase
            .from('daily_votes')
            .select('vote_type')
            .eq('currency', currency)
            // Filter by date is trickier in client-side query without using the view or raw SQL with date(),
            // but for simplicity we rely on the created_at filtering.
            // A reliable way for "today UTC":
            .gte('created_at', `${today}T00:00:00+00:00`),

        user ? supabase
            .from('daily_votes')
            .select('vote_type')
            .eq('user_id', user.id)
            .eq('currency', currency)
            .gte('created_at', `${today}T00:00:00+00:00`)
            .maybeSingle()
            : Promise.resolve({ data: null, error: null })
    ]);

    const votes = statsResult.data || [];

    const bullishCount = votes.filter((v: any) => v.vote_type === 'BULLISH').length;
    const bearishCount = votes.filter((v: any) => v.vote_type === 'BEARISH').length;

    return {
        bullishCount,
        bearishCount,
        totalVotes: bullishCount + bearishCount,
        userVote: userVoteResult.data?.vote_type as VoteType | null
    };
};

export const submitVote = async (type: VoteType, currency: string = 'EUR') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to vote");

    const { error } = await supabase
        .from('daily_votes')
        .insert({
            user_id: user.id,
            vote_type: type,
            currency
        } as any);

    if (error) {
        // Handle unique violation (already voted) gracefully if needed, 
        // though UI should prevent this.
        if (error.code === '23505') { // Unique violation
            throw new Error("ALREADY_VOTED");
        }
        throw error;
    }
};
