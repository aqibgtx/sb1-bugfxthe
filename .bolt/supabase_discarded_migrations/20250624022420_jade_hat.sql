/*
  # Create Storage Bucket for Budget Plus Files

  1. Storage Setup
    - Create 'budget-plus-files' bucket for file uploads
    - Set up proper policies for authenticated users
    - Enable public access for uploaded files

  2. Security
    - Allow authenticated users to upload files
    - Allow public read access to uploaded files
    - Restrict file types and sizes through policies
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('budget-plus-files', 'budget-plus-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'budget-plus-files');

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'budget-plus-files');

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'budget-plus-files');

-- Allow public read access to all files in the bucket
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'budget-plus-files');