"use client";

import React, { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    PlusSignIcon,
    Upload01Icon,
    PackageIcon,
    CheckmarkCircle02Icon,
    AlertCircleIcon,
} from "@hugeicons/core-free-icons";

import {
    StatCard,
    StatCardRow,
    Layout,
    fmtNum,
    ListView,
} from "@/components/patterns";
import {
    CellRef,
    CellDate,
    CellNum,
} from "@/components/ui/table";

import { Button, Input } from "@/components/common";
import { FileUploadModal } from "@/components/common/FileUploadModal";
import type { Column } from "@/components/common/DataTable";

import { api, type SRVListItem, type SRVStats, type PaginatedResponse } from "@/lib/api";

interface SRVListClientProps {
    initialSRVs: PaginatedResponse<SRVListItem>;
    initialStats: SRVStats | null;
}

export const SRVListClient = React.memo(function SRVListClient({ initialSRVs }: SRVListClientProps) {
    const router = useRouter();

    const [data, setData] = useState<PaginatedResponse<SRVListItem>>(initialSRVs);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const columns: Column<SRVListItem>[] = useMemo(() => [
        {
            key: "srv_number",
            label: "SRV #",
            sortable: true,
            width: "120px",
            align: "left",
            render: (_value: string, srv: SRVListItem) => (
                <CellRef value={srv.srv_number} href={`/srv/${encodeURIComponent(srv.srv_number)}`} />
            ),
        },
        {
            key: "srv_date",
            label: "Date",
            sortable: true,
            width: "90px",
            render: (v: string) => <CellDate value={v} />,
        },
        {
            key: "po_number",
            label: "Purchase Order",
            sortable: true,
            width: "125px",
            render: (v: string) => <CellRef value={String(v)} href={`/po/${v}`} />
        },
        {
            key: "total_rcd_qty",
            label: "Received",
            sortable: true,
            width: "80px",
            align: "right",
            render: (v: number) => <CellNum value={v} />
        },
        {
            key: "total_accepted_qty",
            label: "Accepted",
            sortable: true,
            width: "80px",
            align: "right",
            render: (v: number) => <CellNum value={v} />
        },
        {
            key: "total_rej_qty",
            label: "Rejected",
            sortable: true,
            width: "80px",
            align: "right",
            render: (v: number) => <CellNum value={v} />
        },
        {
            key: "actions" as any,
            label: " ",
            width: "40px",
            align: "right",
            render: () => null,
        },
    ], []);

    const fetchData = useMemo(() => async (params: {
        limit: number;
        offset: number;
        sort_by: string;
        order: "asc" | "desc";
        search: string;
    }) => {
        const result = await api.listSRVs(undefined, params);
        setData(result);
        return result;
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            setSelectedFiles(Array.from(e.target.files));
            setIsUploadModalOpen(true);
        }
        e.target.value = "";
    };

    const handleSingleUpload = async (file: File) => {
        const response = await api.uploadSRVBatch([file]);
        const detail = response.results?.[0];
        return {
            filename: file.name,
            success: detail?.success === true,
            message: detail?.message || (detail?.success ? "Uploaded successfully" : "Upload failed"),
            po_number: detail?.po_number,
        };
    };

    const onModalClose = () => {
        setIsUploadModalOpen(false);
        setSelectedFiles([]);
        router.refresh();
    };

    const stats = (
        <StatCardRow>
            <StatCard
                title="Total SRVs"
                value={fmtNum(data.metadata?.total_count || 0)}
                icon={<HugeiconsIcon icon={PackageIcon} className="w-4 h-4" />}
                color="primary"
            />
            <StatCard
                title="Total Received"
                value={fmtNum(data.metadata?.total_received || 0)}
                icon={<HugeiconsIcon icon={PackageIcon} className="w-4 h-4" />}
                color="primary"
            />
            <StatCard
                title="Total Accepted"
                value={fmtNum(data.metadata?.total_accepted || 0)}
                icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" />}
                color="success"
            />
            <StatCard
                title="Total Rejected"
                value={fmtNum(data.metadata?.total_rejected || 0)}
                icon={<HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4" />}
                color="error"
            />
        </StatCardRow>
    );

    return (
        <div className={Layout.colGap}>
            <ListView
                title="Store Receipt Vouchers"
                subtitle="Track material receipts and inspection reports"
                initialData={initialSRVs}
                fetchData={fetchData}
                columns={columns}
                keyField="srv_number"
                defaultSortBy="srv_date"
                defaultSortOrder="desc"
                searchPlaceholder="Search by PO or SRV..."
                stats={stats}
                customToolbar={
                    <>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            accept=".html"
                            onChange={handleFileSelect}
                        />
                        <Button variant="outline" size="compact" onClick={() => fileInputRef.current?.click()}>
                            <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4" />
                            <span className="hidden sm:inline">Upload</span>
                        </Button>
                    </>
                }
            />

            <FileUploadModal
                isOpen={isUploadModalOpen}
                onClose={onModalClose}
                files={selectedFiles}
                onUpload={handleSingleUpload}
                title="Import SRV Data"
            />
        </div>
    );
});
