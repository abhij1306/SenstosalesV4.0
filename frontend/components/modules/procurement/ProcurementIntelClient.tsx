"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Alert02Icon as AlertTriangle,
    PackageIcon,
    DollarCircleIcon as ValueIcons,
    TradeUpIcon as TrendingUp,
    CheckListIcon as QualityIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn, formatIndianCurrency as fmtCurrency } from "@/lib/utils";
import {
    fmtNum,
    fmtCurr,
    PageHeader,
    StatCard,
    StatCardRow,
    SectionCard,
    Layout,
} from "@/components/patterns";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Button, DatePicker } from "@/components/common";
import { api } from "@/lib/api";
import { useToast } from "@/components/common/Toast";

interface ProcurementStat {
    mtrl_cat: string;
    item_count: number;
    total_value: number;
    total_ord: number;
    total_rcd: number;
    total_rej: number;
}

interface QualityStat {
    mtrl_cat: string;
    total_ord: number;
    total_rej: number;
    rejection_rate: number;
}

export function ProcurementIntelClient() {
    const { toast } = useToast();
    const [procurementData, setProcurementData] = useState<ProcurementStat[]>([]);
    const [qualityData, setQualityData] = useState<QualityStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [pResponse, qResponse] = await Promise.all([
                    api.getProcurementAnalytics({ date_from: dateFrom || undefined, date_to: dateTo || undefined }),
                    api.getQualityAnalytics({ date_from: dateFrom || undefined, date_to: dateTo || undefined })
                ]);
                // API returns {categories: [...], metadata: {...}}
                setProcurementData(pResponse?.categories || pResponse || []);
                setQualityData(qResponse?.categories || qResponse || []);
            } catch (error: any) {
                toast("Error", `Failed to load procurement intelligence: ${error.message}`, "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast, dateFrom, dateTo]);

    const totalProcurementValue = useMemo(() =>
        procurementData.reduce((acc, curr) => acc + curr.total_value, 0),
        [procurementData]);

    const qualityYield = useMemo(() => {
        const totalReceived = qualityData.reduce((acc, curr) => acc + curr.total_ord, 0);
        const totalRejected = qualityData.reduce((acc, curr) => acc + curr.total_rej, 0);
        if (totalReceived === 0) return "N/A";
        const yieldRate = ((totalReceived - totalRejected) / totalReceived) * 100;
        return `${yieldRate.toFixed(1)}%`;
    }, [qualityData]);

    const highRiskCategories = useMemo(() =>
        qualityData.filter(q => q.rejection_rate > 5).length,
        [qualityData]);

    const procurementColumns = useMemo<Column<any>[]>(() => [
        {
            key: "mtrl_cat",
            label: "Category ID",
            render: (val) => <span className="typo-mono-md text-primary">{val}</span>,
            sortable: true
        },
        {
            key: "item_count",
            label: "Unique Items",
            render: (val) => fmtNum(val as number),
            sortable: true,
            align: "right"
        },
        {
            key: "total_value",
            label: "Total Value",
            render: (val) => <span className="typo-body-md">{fmtCurr(val as number)}</span>,
            sortable: true,
            align: "right"
        },
        {
            key: "total_ord",
            label: "Ordered Qty",
            render: (val) => fmtNum(val as number),
            sortable: true,
            align: "right"
        }
    ], []);

    const qualityColumns = useMemo<Column<any>[]>(() => [
        {
            key: "mtrl_cat",
            label: "Category ID",
            render: (val) => <span className="typo-mono-md text-primary">{val}</span>,
            sortable: true
        },
        {
            key: "rejection_rate",
            label: "Rejection Rate",
            render: (val) => {
                const rate = val as number;
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 w-16 bg-surface-sunken rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full",
                                    rate > 5 ? "bg-error" : rate > 2 ? "bg-warning" : "bg-success"
                                )}
                                style={{ width: `${Math.min(rate * 10, 100)}%` }}
                            />
                        </div>
                        <span className={cn(
                            "typo-body-sm",
                            rate > 5 ? "text-error" : rate > 2 ? "text-warning" : "text-success"
                        )}>
                            {rate}%
                        </span>
                    </div>
                );
            },
            sortable: true
        },
        {
            key: "total_rej",
            label: "Rejected Qty",
            render: (val) => <span className="text-error typo-body-md">{fmtNum(val as number)}</span>,
            sortable: true,
            align: "right"
        }
    ], []);

    return (
        <div className={Layout.colGap}>
            <PageHeader
                title="Procurement Intelligence"
                subtitle="Data-driven material categorization and quality risk oversight"
                action={
                    <div className="flex items-center gap-2">
                        <DatePicker
                            value={dateFrom}
                            onChange={(val) => setDateFrom(val)}
                            placeholder="From Date"
                        />
                        <span className="text-secondary">-</span>
                        <DatePicker
                            value={dateTo}
                            onChange={(val) => setDateTo(val)}
                            placeholder="To Date"
                        />
                        {(dateFrom || dateTo) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setDateFrom("");
                                    setDateTo("");
                                }}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                }
            />

            <StatCardRow>
                <StatCard
                    title="Total Procurement Value"
                    value={fmtCurr(totalProcurementValue)}
                    icon={<HugeiconsIcon icon={ValueIcons} />}
                    color="primary"
                />
                <StatCard
                    title="Active Categories"
                    value={procurementData.length}
                    icon={<HugeiconsIcon icon={PackageIcon} />}
                    color="secondary"
                />
                <StatCard
                    title="High-Risk Gateways"
                    value={highRiskCategories}
                    icon={<HugeiconsIcon icon={AlertTriangle} />}
                    color="error"
                />
                <StatCard
                    title="Quality Yield"
                    value={qualityYield}
                    icon={<HugeiconsIcon icon={QualityIcon} />}
                    color="success"
                />
            </StatCardRow>

            <div className={Layout.grid12}>
                <div className="lg:col-span-12 xl:col-span-7">
                    <SectionCard
                        title="Category Value Concentration (Pareto)"
                        icon={<HugeiconsIcon icon={TrendingUp} />}
                    >
                        <DataTable
                            columns={procurementColumns}
                            data={procurementData}
                            keyField="mtrl_cat"
                            loading={isLoading}
                            pageSize={10}
                            density="compact"
                        />
                    </SectionCard>
                </div>
                <div className="lg:col-span-12 xl:col-span-5">
                    <SectionCard
                        title="Quality Risk Matrix"
                        icon={<HugeiconsIcon icon={QualityIcon} />}
                    >
                        <DataTable
                            columns={qualityColumns}
                            data={qualityData}
                            keyField="mtrl_cat"
                            loading={isLoading}
                            pageSize={10}
                            density="compact"
                        />
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
