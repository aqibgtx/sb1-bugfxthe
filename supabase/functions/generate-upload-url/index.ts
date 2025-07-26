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
    console.log(`Received ${req.method} request to generate-upload-url`);
    
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { file_name, content_type, folder = 'uploads' } = await req.json();
    console.log('Request payload:', { file_name, content_type, folder });

    if (!file_name || !content_type) {
      return corsResponse({ error: 'Missing required parameters: file_name, content_type' }, 400);
    }

    // Validate required environment variables for Cloudflare R2
    const r2AccessKey = Deno.env.get('R2_ACCESS_KEY_ID');
    const r2SecretKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('R2_BUCKET_NAME');
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');

    if (!r2AccessKey) {
      console.error('R2_ACCESS_KEY_ID environment variable is not set');
      return corsResponse({ error: 'R2 configuration error: Missing access key' }, 500);
    }

    if (!r2SecretKey) {
      console.error('R2_SECRET_ACCESS_KEY environment variable is not set');
      return corsResponse({ error: 'R2 configuration error: Missing secret key' }, 500);
    }

    if (!bucketName) {
      console.error('R2_BUCKET_NAME environment variable is not set');
      return corsResponse({ error: 'R2 configuration error: Missing bucket name' }, 500);
    }

    if (!accountId) {
      console.error('CLOUDFLARE_ACCOUNT_ID environment variable is not set');
      return corsResponse({ error: 'R2 configuration error: Missing account ID' }, 500);
    }

    console.log(`Using Cloudflare R2 bucket: ${bucketName}`);

    // Initialize S3 client for Cloudflare R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKey,
        secretAccessKey: r2SecretKey,
      },
    });
    
    // Create unique file key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file_name.split('.').pop() || 'bin';
    const uniqueFileName = `${file_name.split('.')[0]}_${timestamp}_${randomString}.${fileExtension}`;
    const key = `${folder}/${uniqueFileName}`;

    console.log(`Generated unique key: ${key}`);

    // Create put object command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: content_type,
    });

    // Generate presigned URL for upload
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

    console.log(`Generated upload URL for ${key}`);

    return corsResponse({
      uploadUrl,
      key,
    });
  } catch (error: any) {
    console.error(`Upload URL generation error: ${error.message}`);
    console.error('Error stack:', error.stack);
    return corsResponse({ error: error.message }, 500);
  }
});