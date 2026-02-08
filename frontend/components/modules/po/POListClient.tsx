"use client";

import React, { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, type POListItem, type POStats, type PaginatedResponse } from "@/lib/api";
import { Button, Input } from "@/components/common";
import {
    PageHeader,
    StatCard,
    StatCardRow,
    Layout,
    fmtNum,
    fmtCurr,
    ListView,
} from "@/components/patterns";
import {
    CellRef,
    CellDate,
    CellNum,
    CellCurr,
    CellStatus,
    CellQtyWithPct,
    statusMaps,
} from "@/components/ui/table";
import {
    Invoice01Icon,
    PlusSignIcon,
    Upload01Icon,
    PackageIcon,
    AlertCircleIcon,
    DeliveryTruck01Icon,
    RupeeIcon,
    Search01Icon,
    Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { LinkedDocsPopover } from "./LinkedDocsPopover";
import { FileUploadModal } from "@/components/common/FileUploadModal";
import type { Column } from "@/components/common/DataTable";

// Component to show linked docs button
function LinkedDocsButton({ docType, docNumber }: { docType: string; docNumber: string }) {
    return (
        <LinkedDocsPopover
            docType={docType}
            docNumber={docNumber}
            trigger={
                <Button
                    variant="outline"
                    size="compact"
                    className="text-tertiary hover:text-primary hover:bg-primary/10 px-1.5"
                    title="View linked documents"
                >
                    <HugeiconsIcon icon={Search01Icon} className="w-4 h-4" />
                </Button>
            }
        />
    );
}

interface POListClientProps {
    initialPOs: PaginatedResponse<POListItem>;
    initialStats: POStats;
}

export const POListClient = React.memo(function POListClient({ initialPOs }: POListClientProps) {
    const router = useRouter();
    const [data, setData] = useState<PaginatedResponse<POListItem>>(initialPOs);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Columns definition
    const columns: Column<POListItem>[] = useMemo(() => [
        {
            key: "po_number",
            label: "Reference",
            sortable: true,
            width: "120px",
            render: (_v: any, po: POListItem) => {
                const isFullyDispatched = (po.total_dsp_qty || 0) >= (po.total_ord_qty || 1);
                return (
                    <div className="flex items-center justify-between w-full gap-2">
                        <CellRef
                            value={po.po_number}
                            href={`/po/${po.po_number}`}
                            icon={<HugeiconsIcon icon={Invoice01Icon} className="w-4 h-4 text-tertiary group-hover:text-primary" />}
                        />
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="compact"
                                disabled={isFullyDispatched}
                                className="text-primary hover:text-primary-hover hover:bg-primary/10 disabled:opacity-50 px-1.5 h-7"
                                title="Create DC"
                                onClick={() => !isFullyDispatched && router.push(`/dc/create?po=${encodeURIComponent(po.po_number)}`)}
                            >
                                <HugeiconsIcon icon={PlusSignIcon} className="w-4 h-4" />
                            </Button>
                            <LinkedDocsButton docType="PO" docNumber={po.po_number} />
                        </div>
                    </div>
                );
            },
        },
        {
            key: "po_date",
            label: "Date",
            sortable: true,
            width: "90px",
            render: (v: string) => <CellDate value={v} />,
        },
        {
            key: "total_items_count",
            label: "Items",
            sortable: true,
            width: "60px",
            align: "center",
            render: (v: number) => <CellNum value={v || 0} />,
        },
        {
            key: "total_ord_qty",
            label: "Ordered",
            sortable: true,
            width: "90px",
            align: "right",
            render: (v: number) => <CellNum value={v} />,
        },
        {
            key: "total_dsp_qty",
            label: "Dispatched",
            sortable: true,
            width: "100px",
            align: "right",
            render: (v: number, row: POListItem) => (
                <CellQtyWithPct value={v} total={row.total_ord_qty || 1} />
            ),
        },
        {
            key: "total_rcd_qty",
            label: "Received",
            sortable: true,
            width: "90px",
            align: "right",
            render: (v: number) => <CellNum value={v} />,
        },
        {
            key: "total_rej_qty",
            label: "Rejected",
            sortable: true,
            width: "90px",
            align: "right",
            render: (v: number) => <CellNum value={v} />,
        },
        {
            key: "po_value",
            label: "Value",
            sortable: true,
            width: "110px",
            align: "right",
            render: (_v: any, item: POListItem) => <CellCurr value={item.po_value || 0} />,
        },
        {
            key: "po_status",
            label: "Status",
            sortable: true,
            width: "100px",
            align: "center",
            render: (v: string) => <CellStatus value={v} options={statusMaps.po} />,
        },
    ], [router]);

    // Fetch function for ListView
    const fetchData = useMemo(() => async (params: {
        limit: number;
        offset: number;
        sort_by: string;
        order: "asc" | "desc";
        search: string;
    }) => {
        const result = await api.listPOs(params);
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
        const response = await api.uploadPOBatch([file]);
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
                title="Active Orders"
                value={fmtNum(data?.metadata?.total_count || 0)}
                icon={<HugeiconsIcon icon={PackageIcon} className="w-4 h-4" />}
                color="primary"
            />
            <StatCard
                title="Total Value"
                value={fmtCurr(data?.metadata?.total_value || 0)}
                icon={<HugeiconsIcon icon={RupeeIcon} className="w-4 h-4" />}
                color="success"
            />
            <StatCard
                title="Total Shipped"
                value={fmtNum(data?.metadata?.total_shipped || 0)}
                icon={<HugeiconsIcon icon={DeliveryTruck01Icon} className="w-4 h-4" />}
                color="warning"
            />
            <StatCard
                title="Total Rejected"
                value={fmtNum(data?.metadata?.total_rejected || 0)}
                icon={<HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4" />}
                color="error"
            />
        </StatCardRow>
    );

    return (
        <div className={Layout.colGap}>
            {/* List View */}
            <ListView
                stats={stats}
                title="Purchase Orders"
                subtitle="Manage procurement contracts and track materials"
                initialData={initialPOs}
                fetchData={fetchData}
                columns={columns}
                keyField="po_number"
                defaultSortBy="po_date"
                defaultSortOrder="desc"
                searchPlaceholder="Search orders..."
                customToolbar={
                    <>
                        <Button variant="outline" size="compact" onClick={() => fileInputRef.current?.click()}>
                            <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4" />
                            <span className="hidden sm:inline">Upload</span>
                        </Button>
                        <Button size="compact" onClick={() => router.push("/po/create")}>
                            <HugeiconsIcon icon={PlusSignIcon} className="w-4 h-4" />
                            <span className="hidden sm:inline">Create</span>
                        </Button>
                    </>
                }
            />

            <Input
                type="file"
                multiple
                accept=".html"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
            />

            <FileUploadModal
                isOpen={isUploadModalOpen}
                onClose={onModalClose}
                files={selectedFiles}
                onUpload={handleSingleUpload}
                title="Import PO Data"
            />
        </div>
    );
});
