/// <reference types="deno" />
// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const BATCH_SIZE = 10; // Process 10 issues at a time
const WORKER_ID = crypto.randomUUID();
const LOCK_DURATION = 600; // 10 minutes to allow for longer processing
const MIN_BATCH_INTERVAL = 2000; // 2 seconds between batches to respect rate limits

// Initialize clients
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
});

interface JobItem {
  id: string;
  issue_title: string;
  issue_body: string;
}

async function batchUpdateProgress(
  jobId: string,
  progress: number,
  step: 'fetching_issues' | 'generating_embeddings' | 'finding_duplicates'
) {
  await supabase.rpc('update_job_progress', {
    p_job_id: jobId,
    p_progress: progress,
    p_step: step,
    p_worker_id: WORKER_ID
  });
}

async function processJob(jobId: string) {
  try {
    // Step 1: Check if there are any unprocessed items
    const { count } = await supabase
      .from('analysis_job_items')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .eq('status', 'queued');

    if (!count) {
      // Skip to duplicate detection if no items to process
      await batchUpdateProgress(jobId, 66, 'finding_duplicates');
    } else {
      // Process items in batches
      await batchUpdateProgress(jobId, 0, 'generating_embeddings');

      let processedCount = 0;
      let currentBatch: JobItem[] = [];

      // Stream items to reduce memory usage
      const { data: stream } = await supabase
        .from('analysis_job_items')
        .select('id, issue_title, issue_body')
        .eq('job_id', jobId)
        .eq('status', 'queued')
        .order('batch_number');

      if (!stream) throw new Error('No items to process');

      for (const item of stream) {
        currentBatch.push(item as JobItem);

        if (currentBatch.length === BATCH_SIZE) {
          await processBatch(jobId, currentBatch, processedCount, count);
          processedCount += currentBatch.length;
          currentBatch = [];

          // Add delay between batches for rate limiting
          await new Promise(resolve => setTimeout(resolve, MIN_BATCH_INTERVAL));
        }
      }

      // Process remaining items
      if (currentBatch.length > 0) {
        await processBatch(jobId, currentBatch, processedCount, count);
      }
    }

    // Step 3: Find duplicates using pgvector
    await batchUpdateProgress(jobId, 66, 'finding_duplicates');

    const { error: duplicateError } = await supabase.rpc('find_similar_issues', { 
      p_job_id: jobId,
      p_similarity_threshold: 0.9
    });

    if (duplicateError) throw duplicateError;

    // Complete the job
    await supabase.rpc('release_job_lock', {
      p_job_id: jobId,
      p_worker_id: WORKER_ID,
      p_status: 'completed'
    });

  } catch (error) {
    console.error('Error processing job:', error);

    // Release lock with failed status
    await supabase.rpc('release_job_lock', {
      p_job_id: jobId,
      p_worker_id: WORKER_ID,
      p_status: 'failed'
    });

    // Update job with error
    await supabase
      .from('analysis_jobs')
      .update({
        error: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

async function processBatch(jobId: string, batch: JobItem[], processedCount: number, totalCount: number) {
  const texts = batch.map(item => `${item.issue_title}\n\n${item.issue_body}`);

  // Generate embeddings
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
    dimensions: 1536,
  });

  // Batch update items with embeddings
  const updates = batch.map((item, index) => ({
    id: item.id,
    embedding: response.data[index].embedding,
    status: 'completed',
    completed_at: new Date().toISOString()
  }));

  // Use upsert to update all items in one call
  const { error } = await supabase
    .from('analysis_job_items')
    .upsert(updates);

  if (error) throw error;

  // Update progress
  const progress = Math.min(33 + ((processedCount + batch.length) / totalCount) * 33, 66);
  await batchUpdateProgress(jobId, progress, 'generating_embeddings');
}

serve(async (_req: Request) => {
  try {
    // Only process if there are queued jobs
    const { count } = await supabase
      .from('analysis_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'queued');

    if (!count) {
      return new Response('No jobs to process', { status: 200 });
    }

    // Try to acquire a job
    const { data: jobs, error: lockError } = await supabase
      .rpc('acquire_job_lock', {
        worker_id: WORKER_ID,
        lock_duration_seconds: LOCK_DURATION
      });

    if (lockError) throw lockError;
    if (!jobs?.length) {
      return new Response('No jobs available to process', { status: 200 });
    }

    const [job] = jobs;
    await processJob(job.job_id);

    return new Response('Job processed successfully', { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    return new Response(error.message, { status: 500 });
  }
});