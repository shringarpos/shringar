-- Migration: Add access requests for restricted registration
CREATE TABLE IF NOT EXISTS public.access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    shop_name TEXT,
    phone TEXT,
    notes TEXT,
    approval_token TEXT NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'registered')),
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on email and status for fast lookups
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON public.access_requests (lower(email));
CREATE INDEX IF NOT EXISTS idx_access_requests_token ON public.access_requests (approval_token);

-- Enable RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public/anon) to submit an access request
CREATE POLICY "Allow public insert into access_requests"
    ON public.access_requests
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Allow public to select access requests (e.g. check status by email or token)
CREATE POLICY "Allow public read access_requests"
    ON public.access_requests
    FOR SELECT
    TO public
    USING (true);

-- Allow updates (e.g. approving token or status update)
CREATE POLICY "Allow update access_requests"
    ON public.access_requests
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);
