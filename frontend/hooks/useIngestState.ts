import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/components/common/Toast";
import { api } from '@/lib/api';

export interface IngestStatus {
    is_running: boolean;
    status: string;
    progress: number;
    total_pos: number;
    processed_pos: number;
    current_po: string;
    error?: string;
    last_sync?: string;
}

const INITIAL_STATUS: IngestStatus = {
    is_running: false,
    status: 'Idle',
    progress: 0,
    total_pos: 0,
    processed_pos: 0,
    current_po: '',
};

export interface IngestState {
    status: IngestStatus;
    trigger: (payload: any) => Promise<void>;
    cancel: () => Promise<void>;
    reset: () => Promise<void>;
    fetchStatus: () => Promise<void>;
}

export function useIngestState(type: 'po' | 'srv'): IngestState {
    const { toast } = useToast();
    const [status, setStatus] = useState<IngestStatus>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`ingest_status_${type}`);
            return saved ? JSON.parse(saved) : INITIAL_STATUS;
        }
        return INITIAL_STATUS;
    });

    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    const fetchStatus = useCallback(async function fetchStatus(): Promise<void> {
        try {
            const data = await api.getIngestStatus(type);
            setStatus(prev => {
                const next = { ...prev, ...data };
                localStorage.setItem(`ingest_status_${type}`, JSON.stringify(next));
                return next;
            });

            if (!data.is_running && pollInterval.current) {
                clearInterval(pollInterval.current);
                pollInterval.current = null;
            }
        } catch (error) {
            console.error(`Failed to fetch ${type} status:`, error);
        }
    }, [type]);

    useEffect(() => {
        if (status.is_running && !pollInterval.current) {
            pollInterval.current = setInterval(fetchStatus, 2000);
        }
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [status.is_running, fetchStatus]);

    async function trigger(payload: any): Promise<void> {
        try {
            const res = await api.triggerIngest({ ...payload, type });
            if (res.success) {
                setStatus(prev => ({ ...prev, is_running: true, status: 'Starting...' }));
                toast(`Ingestion Started`, res.message, 'success');
            } else {
                toast('Failed to trigger Ingestion', res.message, 'error');
            }
        } catch (error: any) {
            toast('Error', error.message, 'error');
        }
    }

    async function cancel(): Promise<void> {
        try {
            await api.cancelIngest(type);
            toast('Cancellation Requested', undefined, 'warning');
            fetchStatus();
        } catch (error: any) {
            toast('Cancel Failed', error.message, 'error');
        }
    }

    async function reset(): Promise<void> {
        try {
            await api.resetIngestStatus(type);
            setStatus(INITIAL_STATUS);
            localStorage.removeItem(`ingest_status_${type}`);
            toast('Status Reset', undefined, 'info');
        } catch (error: any) {
            toast('Reset Failed', error.message, 'error');
        }
    }

    return { status, trigger, cancel, reset, fetchStatus };
}
