-- Create deletion_requests table
CREATE TABLE IF NOT EXISTS deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    user_id TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    notes TEXT
);

-- Create index for faster lookups
CREATE INDEX idx_deletion_requests_email ON deletion_requests(email);
CREATE INDEX idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX idx_deletion_requests_created_at ON deletion_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert deletion requests
CREATE POLICY "Allow anonymous insertion" ON deletion_requests
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Policy: Only authenticated users can view deletion requests (for admin dashboard)
CREATE POLICY "Allow authenticated read" ON deletion_requests
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only authenticated users can update deletion requests (for admin processing)
CREATE POLICY "Allow authenticated update" ON deletion_requests
    FOR UPDATE
    TO authenticated
    USING (true);

-- Add comment for documentation
COMMENT ON TABLE deletion_requests IS 'Stores user account deletion requests submitted via the public form';
