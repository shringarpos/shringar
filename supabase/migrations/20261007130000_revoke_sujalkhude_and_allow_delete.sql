-- Revoke access for sujalkhude and cleanup test records
DELETE FROM public.access_requests WHERE email ILIKE 'sujalkhude%' OR email ILIKE 'testjeweler%';
DELETE FROM auth.users WHERE email ILIKE 'sujalkhude%' OR email ILIKE 'testjeweler%';

-- Allow DELETE on access_requests
CREATE POLICY "Allow public delete access_requests"
    ON public.access_requests
    FOR DELETE
    TO public
    USING (true);
