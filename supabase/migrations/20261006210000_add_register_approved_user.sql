-- Function to allow approved users to register without hitting public email limits
CREATE OR REPLACE FUNCTION public.register_approved_user(
  p_email text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_req_id uuid;
  v_user_id uuid := gen_random_uuid();
  v_identity_id uuid := gen_random_uuid();
  v_encrypted_pw text;
  v_full_name text;
  v_shop_name text;
BEGIN
  -- 1. Check access_requests
  SELECT id, full_name, shop_name INTO v_req_id, v_full_name, v_shop_name
  FROM public.access_requests
  WHERE lower(email) = lower(p_email) AND status = 'approved'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_req_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Email is not approved by administrator.');
  END IF;

  -- 2. Encrypt password using pgcrypto bf
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- 3. Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    phone,
    is_anonymous,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(p_email),
    v_encrypted_pw,
    now(),
    now(),
    '',
    false,
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('name', v_full_name, 'shop_name', v_shop_name, 'email_verified', true)::jsonb,
    now(),
    now()
  );

  -- 4. Insert into auth.identities
  INSERT INTO auth.identities (
    identity_id,
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_identity_id,
    v_user_id::text,
    v_user_id,
    json_build_object('sub', v_user_id::text, 'email', lower(p_email), 'email_verified', true)::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- 5. Mark request as registered
  UPDATE public.access_requests
  SET status = 'registered', updated_at = now()
  WHERE id = v_req_id;

  RETURN json_build_object('success', true, 'user_id', v_user_id);
END;
$$;

-- Grant execution to anon and authenticated
GRANT EXECUTE ON FUNCTION public.register_approved_user(text, text) TO anon, authenticated;
