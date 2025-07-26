import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.490.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.490.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function corsResponse(body: string | object | null, status = 200) {
  if (status === 204) {
    return new Response(null, { status, headers: corsHeaders });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { file_name, content_type, folder = 'uploads' } = await req.json();

    if (!file_name || !content_type) {
      return corsResponse({ error: 'Missing required parameters: file_name, content_type' }, 400);
    }

    // Get Cloudflare R2 credentials from environment
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('R2_BUCKET_NAME');
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');

    if (!accessKeyId || !secretAccessKey || !bucketName || !accountId) {
      return corsResponse({ error: 'Missing R2 configuration env vars' }, 500);
    }

    // Create unique key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file_name.split('.').pop() || 'bin';
    const baseName = file_name.split('.')[0];
    const uniqueName = `${baseName}_${timestamp}_${randomString}.${extension}`;
    const key = `${folder}/${uniqueName}`;

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: content_type,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    return corsResponse({
      uploadUrl,
      key,
      publicUrl: `https://pub-65084e9706ea4dfba6655c7488dd40ca.r2.dev/${key}`,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return corsResponse({ error: err.message }, 500);
  }
});
