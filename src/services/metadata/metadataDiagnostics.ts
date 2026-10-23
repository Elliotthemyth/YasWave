/**
 * Development-only Metadata Diagnostics Collector
 * Captures raw audio metadata frames and resolved fields during import
 * to diagnose tag-mapping and numeric artist issues.
 */

export interface MetadataDiagnosticEntry {
  timestamp: number;
  fileName: string;
  fileExtension: string;
  fileSize: number;
  fileType: string;
  common: {
    artist?: string;
    artists?: string[];
    albumartist?: string;
    title?: string;
    album?: string;
    track?: { no: number | null; of: number | null };
    genre?: string[];
    year?: number;
  };
  nativeFormatTypes: string[];
  relevantFrames: Record<string, any>;
  allNativeFramesSummary: Record<string, Array<{ id: string; value: any }>>;
  finalResolvedArtist: string;
  finalResolvedTitle: string;
}

const diagnosticLog: MetadataDiagnosticEntry[] = [];

/**
 * Record a diagnostic entry (development mode only)
 */
export function recordMetadataDiagnostic(entry: MetadataDiagnosticEntry): void {
  if (!import.meta.env.DEV) {
    return; // Never log or retain in production builds
  }

  // Keep up to 50 recent imports
  diagnosticLog.push(entry);
  if (diagnosticLog.length > 50) {
    diagnosticLog.shift();
  }

  // Output structured log to browser developer console
  console.group(
    `%c[Metadata Diagnostic]%c ${entry.fileName} %c(Resolved Artist: "${entry.finalResolvedArtist}")`,
    'color: #06b6d4; font-weight: bold;',
    'color: #ffffff; font-weight: bold;',
    'color: #f59e0b; font-weight: normal;'
  );
  console.log('File:', {
    name: entry.fileName,
    extension: entry.fileExtension,
    sizeBytes: entry.fileSize,
    mimeType: entry.fileType,
  });
  console.log('parsed.common:', entry.common);
  console.log('Relevant Native Frames (TPE1, TPE2, TCON, TRCK, etc.):', entry.relevantFrames);
  console.log('All Native Frames Summary:', entry.allNativeFramesSummary);
  console.log('Final Selected Artist:', entry.finalResolvedArtist);
  console.log('Full Diagnostic JSON string:');
  console.log(JSON.stringify(entry, null, 2));
  console.groupEnd();
}

/**
 * Retrieve all captured diagnostic entries in the current session
 */
export function getMetadataDiagnostics(): MetadataDiagnosticEntry[] {
  return [...diagnosticLog];
}

/**
 * Clear captured diagnostic logs
 */
export function clearMetadataDiagnostics(): void {
  diagnosticLog.length = 0;
}

/**
 * Export diagnostic entries as pretty JSON string for copy-pasting
 */
export function exportDiagnosticsJson(): string {
  return JSON.stringify(diagnosticLog, null, 2);
}
