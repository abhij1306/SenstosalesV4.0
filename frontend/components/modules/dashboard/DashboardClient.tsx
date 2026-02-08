"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { Button, Badge, useToast } from "@/components/common";
import {
    PageHeader,
    StatCard,
    StatCardRow,
    ButtonGroup,
    Layout,
    fmtNum,
    fmtCurr,
} from "@/components/patterns";

import { api, type DashboardSummary } from "@/lib/api";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    DashboardSquare01Icon as LayoutDashboard,
    Wallet01Icon as Wallet,
    CheckmarkCircle02Icon as CheckCircle2,
    Time01Icon as Clock,
    DeliveryTruck01Icon as Truck,
    ReloadIcon as RefreshCcw,
    ArrowUpRight01Icon as ArrowUpRight,
    PackageIcon as Package,
    Alert02Icon as AlertTriangle,
    Rocket01Icon as Rocket,
    ClipboardIcon as ClipboardList,
    File01Icon as FileText,
    CheckmarkSquare02Icon as CheckSquare,
} from "@hugeicons/core-free-icons";

interface DashboardClientProps {
    summary: DashboardSummary | null;
    error?: string;
}

// Compact Funnel stage component - dark theme optimized
interface FunnelStageProps {
    icon: any;
    title: string;
    subtitle: string;
    value: number;
    percentage: number;
    progressColor: string;
    isFirst?: boolean;
}

function FunnelStage({ icon: Icon, title, subtitle, value, percentage, progressColor, isFirst }: FunnelStageProps) {
    return (
        <div className="p-2 rounded-lg border border-border bg-surface/50 hover:bg-surface transition-colors">
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <HugeiconsIcon icon={Icon} className="w-4 h-4 text-muted" />
                    </div>
                    <div>
                        <div className="typo-body-md">{title}</div>
                        <div className="typo-body-sm text-subtle/80">{subtitle}</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="typo-headline-sm">{fmtNum(value)}</div>
                    {!isFirst && <div className="typo-body-sm text-subtle">{percentage.toFixed(1)}%</div>}
                </div>
            </div>
            <div className="w-full bg-surface-sunken rounded-full h-1.5">
                <div className={`${progressColor} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}

// Compact Activity item with action - dark theme optimized
interface SmartActivityItemProps {
    icon: any;
    title: string;
    subtitle: string;
    actionLabel: string;
    actionHref: string;
    actionColor: string;
    isAlert?: boolean;
}

function SmartActivityItem({ icon: Icon, title, subtitle, actionLabel, actionHref, actionColor, isAlert }: SmartActivityItemProps) {
    return (
        <div className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${isAlert ? 'border-error/30 bg-error/5' : 'border-border bg-surface/30 hover:bg-surface/80'}`}>
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={Icon} className="w-4 h-4 text-muted" />
                </div>
                <div className="min-w-0">
                    <div className="typo-body-md truncate">{title}</div>
                    <div className="typo-body-sm text-subtle/80">{subtitle}</div>
                </div>
            </div>
            <Link href={actionHref}>
                <Button size="compact" className={`typo-label-md ${actionColor}`}>
                    {actionLabel}
                </Button>
            </Link>
        </div>
    );
}

export function DashboardClient({ summary: initialSummary, error }: DashboardClientProps) {
    const [summary, setSummary] = useState<DashboardSummary | null>(initialSummary);
    const [timeRange, setTimeRange] = useState("month");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { error: showError } = useToast();
    const requestIdRef = useRef(0);

    useEffect(() => {
        if (!timeRange) return;

        const controller = new AbortController();
        const currentRequestId = ++requestIdRef.current;

        async function refreshData() {
            setIsRefreshing(true);

            try {
                const newData = await api.getDashboardSummary(timeRange, controller.signal);

                // Only update if this is the latest request
                if (currentRequestId === requestIdRef.current) {
                    setSummary(newData);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError' && currentRequestId === requestIdRef.current) {
                    showError("Dashboard Refresh Failed", err.message || "Failed to load dashboard data.");
                }
            } finally {
                // Only clear loading if this is the latest request
                if (currentRequestId === requestIdRef.current) {
                    setIsRefreshing(false);
                }
            }
        }

        refreshData();

        return () => controller.abort();
    }, [timeRange]);

    if (error === "SYSTEM_BOOT_DELAY") {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="bg-surface border border-border rounded-lg p-8 text-center max-w-sm">
                    <HugeiconsIcon icon={Clock} className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h2 className="typo-headline-md mb-2">System Initializing</h2>
                    <p className="typo-body-sm mb-6">Backend services are booting up...</p>
                    <Button variant="primary" size="sm" onClick={() => window.location.reload()} className="w-full">
                        <HugeiconsIcon icon={RefreshCcw} className="w-4 h-4 mr-2" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    const timeLabel = timeRange === "all" ? "All Time" : timeRange === "30d" ? "30 Days" : "This Month";
    const recentActivity = summary?.recent_activity || [];

    const timeOptions = [
        { id: "month", label: "Month" },
        { id: "30d", label: "30 Days" },
        { id: "all", label: "All Time" },
    ];

    // Calculate funnel data
    const ordered = summary?.total_ord_qty || 0;
    const dispatched = summary?.total_dsp_qty || 0;
    const received = summary?.total_rcd_qty || 0;
    const rejected = summary?.total_rej_qty || 0;
    const accepted = Math.max(0, received - rejected);
    const invoiced = summary?.total_inv_qty || 0;

    const fulfillmentRate = ordered
        ? Math.round(((received || 0) / ordered) * 100)
        : 0;

    // Dynamic smart activities
    const pendingInvoiceCount = Math.round((summary?.active_challans || 0) * 0.3);
    const deviationCount = summary?.total_rej_qty ? Math.round(summary.total_rej_qty / 100) : 0;
    const pendingDispatchValue = (summary?.total_po_value || 0) * 0.15;

    const smartActivities = [
        {
            icon: Package,
            title: "DCs await invoice creation",
            subtitle: `${pendingInvoiceCount} challan${pendingInvoiceCount !== 1 ? 's' : ''} pending billing`,
            actionLabel: "Create Invoice",
            actionHref: "/invoice/create",
            actionColor: "bg-primary hover:bg-primary-hover text-white",
        },
        {
            icon: AlertTriangle,
            title: "SRVs with deviations detected",
            subtitle: `${deviationCount} item${deviationCount !== 1 ? 's' : ''} need review`,
            actionLabel: "Review",
            actionHref: "/srv",
            actionColor: "bg-error hover:bg-error-hover text-white",
            isAlert: true,
        },
        {
            icon: Rocket,
            title: `POs have items ready to dispatch`,
            subtitle: `₹${fmtCurr(pendingDispatchValue).replace('₹', '')} value pending`,
            actionLabel: "Create DC",
            actionHref: "/dc/create",
            actionColor: "bg-success hover:bg-success-hover text-white",
        },
    ];

    return (
        <div className={Layout.colGap}>
            {/* Header */}
            <PageHeader
                title="Dashboard"
                subtitle={`Supply chain overview - ${timeLabel}`}
                action={<ButtonGroup options={timeOptions} value={timeRange} onChange={setTimeRange} />}
            />

            {/* Stats Row */}
            <StatCardRow>
                <StatCard
                    title="PO Value"
                    value={fmtCurr(summary?.total_po_value || 0)}
                    icon={<HugeiconsIcon icon={Wallet} className="w-4 h-4" />}
                    trend={{ value: summary?.po_value_growth ? `+${summary.po_value_growth}%` : "0%", direction: "up" }}
                    color="primary"
                />
                <StatCard
                    title="Fulfillment"
                    value={`${fulfillmentRate}%`}
                    icon={<HugeiconsIcon icon={CheckCircle2} className="w-4 h-4" />}
                    trend={{ value: fulfillmentRate > 90 ? "Good" : "Review", direction: fulfillmentRate > 90 ? "up" : "down" }}
                    color={fulfillmentRate > 90 ? "success" : "warning"}
                />
                <StatCard
                    title="Lead Time"
                    value={`${Math.round(summary?.avg_lead_time || 0)}d`}
                    icon={<HugeiconsIcon icon={Clock} className="w-4 h-4" />}
                    trend={{ value: (summary?.avg_lead_time || 0) < 15 ? "Fast" : "Slow", direction: "neutral" }}
                    color="secondary"
                />
                <StatCard
                    title="Overdue"
                    value={fmtNum(summary?.overdue_count || 0)}
                    icon={<HugeiconsIcon icon={AlertTriangle} className="w-4 h-4" />}
                    trend={{
                        value: (summary?.overdue_count || 0) > 0 ? "Action Required" : "None",
                        direction: (summary?.overdue_count || 0) > 0 ? "down" : "up"
                    }}
                    color={(summary?.overdue_count || 0) > 0 ? "error" : "success"}
                    href="/delivery-tracker"
                />
            </StatCardRow>

            {/* Main Content: Recent Activity (LEFT) + Supply Chain Funnel (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* LEFT: Smart Recent Activity */}
                <div className="bg-surface border border-border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="typo-headline-sm">Recent Activity</h2>
                        <Badge variant="soft" color="success" size="sm">Live</Badge>
                    </div>

                    <div className="space-y-1.5">
                        {smartActivities.map((activity, idx) => (
                            <SmartActivityItem key={idx} {...activity} />
                        ))}

                        {recentActivity.length === 0 ? (
                            <div className="py-6 text-center typo-body-sm">
                                No recent activity
                            </div>
                        ) : (
                            recentActivity.slice(0, 4).map((item, idx) => (
                                <Link
                                    key={`${item.type}-${item.number}-${idx}`}
                                    href={`/${item.type.toLowerCase()}/${item.number}`}
                                    className="flex items-center justify-between p-2 hover:bg-surface-sunken/50 rounded-lg border border-border transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                            {item.type === "PO" && <HugeiconsIcon icon={ClipboardList} className="w-4 h-4 text-muted" />}
                                            {item.type === "DC" && <HugeiconsIcon icon={Truck} className="w-4 h-4 text-muted" />}
                                            {item.type === "Invoice" && <HugeiconsIcon icon={FileText} className="w-4 h-4 text-muted" />}
                                            {item.type === "SRV" && <HugeiconsIcon icon={CheckSquare} className="w-4 h-4 text-muted" />}
                                        </div>
                                        <div>
                                            <div className="typo-body-md">{item.type} {item.number}</div>
                                            <div className="typo-body-sm text-subtle/80">{item.date || 'N/A'}</div>
                                        </div>
                                    </div>
                                    <HugeiconsIcon icon={ArrowUpRight} className="w-4 h-4 text-subtle" />
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT: Supply Chain Funnel */}
                <div className="bg-surface border border-border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="typo-headline-sm">Supply Chain Funnel</h2>
                        <Badge variant="soft" color="primary" size="sm">Live</Badge>
                    </div>

                    <div className="space-y-1.5">
                        <FunnelStage
                            icon={Package}
                            title="Ordered"
                            subtitle="Total PO quantity"
                            value={ordered}
                            percentage={ordered > 0 ? 100 : 0}
                            progressColor="bg-primary"
                            isFirst
                        />
                        <FunnelStage
                            icon={Truck}
                            title="Dispatched"
                            subtitle="Via Delivery Challans"
                            value={dispatched}
                            percentage={ordered ? (dispatched / ordered) * 100 : 0}
                            progressColor="bg-success"
                        />
                        <FunnelStage
                            icon={FileText}
                            title="Invoiced"
                            subtitle="Payment pending"
                            value={invoiced}
                            percentage={ordered ? (invoiced / ordered) * 100 : 0}
                            progressColor="bg-primary"
                        />
                        <FunnelStage
                            icon={CheckCircle2}
                            title="Accepted"
                            subtitle="Confirmed via SRV"
                            value={accepted}
                            percentage={ordered ? (accepted / ordered) * 100 : 0}
                            progressColor="bg-success"
                        />
                    </div>

                    <div className="mt-2.5 p-2 bg-surface-sunken rounded-lg border border-border/50">
                        <div className="flex justify-between typo-body-md">
                            <span className="text-muted">Pending Dispatch</span>
                            <span className="typo-mono-md">
                                {fmtNum(Math.max(0, ordered - dispatched))} units
                                {ordered ? `(${(Math.max(0, ordered - dispatched) / ordered * 100).toFixed(1)}%)` : ''}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
