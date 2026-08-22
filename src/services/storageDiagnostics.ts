import { supabase } from '../lib/supabase';
import { MOTORCYCLE_DOCUMENTS_BUCKET, sanitizeStoragePath, verifyDocumentObjectExists } from './documentService';

export interface StorageDiagnosticResult {
  supabaseProjectUrl: string;
  authenticatedUserId: string | null;
  bucketsFound: string[];
  motorcycleDocsBucketExists: boolean;
  bucketCheckError: string | null;
  databaseRecordsCount: number;
  sampleDocument: any | null;
  signedUrlTest: {
    rawPath: string | null;
    cleanPath: string | null;
    signedUrl: string | null;
    error: any | null;
  };
}

export interface DocumentDiagnosticReport {
  supabaseProject: boolean;
  supabaseUrl: string;
  authenticatedUser: boolean;
  authenticatedUserId: string | null;
  databaseRecordFound: boolean;
  documentRecord: any | null;
  bucketExists: boolean;
  bucket: string;
  storagePath: string;
  objectExists: boolean;
  signedUrlCreated: boolean;
  signedUrl: string | null;
  status:
    | 'SUCCESS'
    | 'DOCUMENT_NOT_IN_DB'
    | 'DOCUMENT_OBJECT_NOT_FOUND'
    | 'BUCKET_NOT_FOUND'
    | 'SIGNED_URL_FAILED'
    | 'UNAUTHENTICATED';
  error: string | null;
}

export async function diagnoseMotorcycleDocument(documentId: string): Promise<DocumentDiagnosticReport> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const report: DocumentDiagnosticReport = {
    supabaseProject: supabaseUrl.includes('supabase.co'),
    supabaseUrl,
    authenticatedUser: false,
    authenticatedUserId: null,
    databaseRecordFound: false,
    documentRecord: null,
    bucketExists: false,
    bucket: MOTORCYCLE_DOCUMENTS_BUCKET,
    storagePath: '',
    objectExists: false,
    signedUrlCreated: false,
    signedUrl: null,
    status: 'DOCUMENT_NOT_IN_DB',
    error: null,
  };

  try {
    // 1. Auth User
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      report.authenticatedUser = true;
      report.authenticatedUserId = authData.user.id;
    }

    // 2. Fetch Database Record
    const { data: docRecord, error: dbErr } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (dbErr || !docRecord) {
      report.status = 'DOCUMENT_NOT_IN_DB';
      report.error = dbErr?.message || 'Document record not found in database.';
      return report;
    }

    report.databaseRecordFound = true;
    report.documentRecord = docRecord;

    // 3. Resolve Location
    const rawPath = docRecord.file_path || docRecord.file_url || '';
    const location = sanitizeStoragePath(rawPath);
    report.bucket = location.bucket;
    report.storagePath = location.path;

    // 4. Verify Bucket
    const { data: buckets } = await supabase.storage.listBuckets();
    report.bucketExists = buckets ? buckets.some(b => b.name === location.bucket) : false;
    if (!report.bucketExists) {
      report.status = 'BUCKET_NOT_FOUND';
      report.error = `Storage bucket "${location.bucket}" does not exist in Supabase backend.`;
      return report;
    }

    // 5. Verify Storage Object Exists
    const check = await verifyDocumentObjectExists(location.bucket, location.path);
    report.objectExists = check.exists;
    if (!check.exists) {
      report.status = 'DOCUMENT_OBJECT_NOT_FOUND';
      report.error = check.error || 'Binary document file does not exist in Supabase Storage.';
      return report;
    }

    // 6. Generate Signed URL
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(location.bucket)
      .createSignedUrl(location.path, 3600);

    if (signedErr || !signedData?.signedUrl) {
      report.status = 'SIGNED_URL_FAILED';
      report.error = signedErr?.message || 'Unable to sign document URL.';
      return report;
    }

    report.signedUrlCreated = true;
    report.signedUrl = signedData.signedUrl;
    report.status = 'SUCCESS';
    return report;
  } catch (err: any) {
    report.error = err?.message || String(err);
    return report;
  }
}

export async function diagnoseMotorcycleDocumentStorage(): Promise<StorageDiagnosticResult> {
  const result: StorageDiagnosticResult = {
    supabaseProjectUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'UNKNOWN',
    authenticatedUserId: null,
    bucketsFound: [],
    motorcycleDocsBucketExists: false,
    bucketCheckError: null,
    databaseRecordsCount: 0,
    sampleDocument: null,
    signedUrlTest: {
      rawPath: null,
      cleanPath: null,
      signedUrl: null,
      error: null,
    },
  };

  try {
    const { data: userData } = await supabase.auth.getUser();
    result.authenticatedUserId = userData?.user?.id || null;

    const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
    if (bucketErr) {
      result.bucketCheckError = bucketErr.message || JSON.stringify(bucketErr);
    } else if (buckets) {
      result.bucketsFound = buckets.map(b => b.name);
      result.motorcycleDocsBucketExists = buckets.some(b => b.name === MOTORCYCLE_DOCUMENTS_BUCKET);
    }

    const { data: dbDocs, error: dbErr } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!dbErr && dbDocs) {
      result.databaseRecordsCount = dbDocs.length;
      if (dbDocs.length > 0) {
        result.sampleDocument = dbDocs[0];
        const rawPath = dbDocs[0].file_path || dbDocs[0].file_url || '';
        result.signedUrlTest.rawPath = rawPath;

        if (rawPath) {
          const loc = sanitizeStoragePath(rawPath);
          result.signedUrlTest.cleanPath = loc.path;

          const { data: signedData, error: signedErr } = await supabase.storage
            .from(loc.bucket)
            .createSignedUrl(loc.path, 3600);

          if (!signedErr && signedData?.signedUrl) {
            result.signedUrlTest.signedUrl = signedData.signedUrl;
          } else {
            result.signedUrlTest.error = signedErr || 'No signed URL returned';
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[Diagnostic Exception]:', err);
    result.bucketCheckError = err?.message || String(err);
  }

  console.log('=== RIDERHOOD STORAGE DIAGNOSTIC REPORT ===');
  console.log(JSON.stringify(result, null, 2));
  return result;
}
