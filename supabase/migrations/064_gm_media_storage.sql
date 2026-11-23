-- ============================================================
-- 064_gm_media_storage
-- Origin: GeniusMindsCRM-Complete "Media Storage" page (upload
-- course marketing assets). Private bucket, account-scoped paths:
--   gm-media/account-<account_id>/<file>
-- Same folder convention as chat-media / flow-media (023, 043).
-- Read: any account member. Write/delete: agent and above.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gm-media',
  'gm-media',
  FALSE,
  26214400, -- 25 MB
  ARRAY[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
    'video/mp4', 'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Members can read gm media" ON storage.objects;
CREATE POLICY "Members can read gm media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'gm-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Agents can upload gm media" ON storage.objects;
CREATE POLICY "Agents can upload gm media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gm-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.account_role IN ('owner', 'admin', 'agent')
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Agents can delete gm media" ON storage.objects;
CREATE POLICY "Agents can delete gm media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'gm-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.account_role IN ('owner', 'admin', 'agent')
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
    )
  );
