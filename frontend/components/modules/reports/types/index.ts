/**
 * Reports Module Types
 */

export interface ReportItem {
    id?: string | number;
    description: string;
    generated_at: string;
    status: "pending" | "processing" | "completed" | "failed";
    download_url?: string;
    type?: string;
}

export interface ReportsStats {
    total_generated: number;
    pending_count: number;
}
