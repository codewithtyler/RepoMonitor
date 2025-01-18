import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://invnvjkgkxrjdbttjfux.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludnZ2amtna3hyamRidHRqZnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU0OTc2MDAsImV4cCI6MjAyMTA3MzYwMH0.0Oi7T-7T1k8-Zr9OeWQtF1J5FN-YUTpB1mZxJmhxvGE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    try {
        const { data, error } = await supabase
            .from('repositories')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log('Repository Schema:', Object.keys(data[0]));
        } else {
            console.log('No repositories found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkSchema();
