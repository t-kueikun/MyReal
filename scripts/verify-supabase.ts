import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET || 'myreal';

console.log('Testing Supabase Connection...');
console.log('URL:', url);
console.log('Key:', key ? key.slice(0, 10) + '...' : 'MISSING');
console.log('Bucket:', bucket);

if (!url || !key) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
    const filename = `test-${Date.now()}.txt`;
    console.log('Attempting upload:', filename);

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, 'Hello World', {
            contentType: 'text/plain',
            upsert: true
        });

    if (error) {
        console.error('Upload failed:', error);
        process.exit(1);
    } else {
        console.log('Upload successful:', data);

        // Clean up
        await supabase.storage.from(bucket).remove([filename]);
        console.log('Cleanup successful');
    }
}

test();
