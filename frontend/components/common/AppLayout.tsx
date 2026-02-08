"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    DashboardSquare01Icon,
    CheckListIcon,
    DeliveryTruck01Icon,
    Invoice01Icon,
    TaskDone01Icon,
    Analytics01Icon,
    SecurityCheckIcon,
    Settings01Icon,
    ArrowLeft02Icon,
    Search01Icon,
    ArrowRight02Icon,
    Notification01Icon,
    PackageIcon
} from "@hugeicons/core-free-icons";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GlobalSearch } from "@/components/common/GlobalSearch";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/common/Tooltip";

interface NavItem {
    key: string;
    icon: any;
    label: string;
    href: string;
}

const navItems: NavItem[] = [
    { key: '/', icon: DashboardSquare01Icon, label: 'Dashboard', href: '/' },
    { key: '/po', icon: CheckListIcon, label: 'Orders', href: '/po' },
    { key: '/dc', icon: DeliveryTruck01Icon, label: 'Delivery', href: '/dc' },
    { key: '/invoice', icon: Invoice01Icon, label: 'Invoices', href: '/invoice' },
    { key: '/srv', icon: TaskDone01Icon, label: 'SRV', href: '/srv' },
    { key: '/reports', icon: Analytics01Icon, label: 'Reports', href: '/reports' },
    { key: '/system/ledger', icon: SecurityCheckIcon, label: 'Ledger', href: '/system/ledger' },
    { key: '/settings', icon: Settings01Icon, label: 'Settings', href: '/settings' },
];

// SWR Fetcher
const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const errorText = await res.text();
        const error = new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
        throw error;
    }
    return res.json();
};

// Delivery Alerts Badge Component
function DeliveryAlertsBadge() {
    const { data } = useSWR<{ total_alerts: number; overdue_count: number; due_soon_count: number }>(
        '/api/delivery-tracker/alerts',
        fetcher,
        { refreshInterval: 60000, dedupingInterval: 30000 }
    );

    const totalAlerts = data?.total_alerts || 0;
    const hasAlerts = totalAlerts > 0;
    const hasOverdue = (data?.overdue_count || 0) > 0;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    href="/delivery-tracker"
                    className={cn(
                        "relative p-2 rounded-lg transition-colors",
                        hasOverdue
                            ? "text-error hover:bg-error/10"
                            : hasAlerts
                                ? "text-warning hover:bg-warning/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-surface-sunken"
                    )}
                >
                    <HugeiconsIcon icon={Notification01Icon} className="w-5 h-5" />
                    {hasAlerts && (
                        <span className={cn(
                            "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center typo-label-md rounded-full px-1 text-white",
                            hasOverdue ? "bg-error" : "bg-warning"
                        )}>
                            {totalAlerts > 99 ? "99+" : totalAlerts}
                        </span>
                    )}
                </Link>
            </TooltipTrigger>
            <TooltipContent>
                {hasOverdue
                    ? `${data?.overdue_count} overdue deliveries`
                    : hasAlerts
                        ? `${data?.due_soon_count} deliveries due soon`
                        : "No delivery alerts"}
            </TooltipContent>
        </Tooltip>
    );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [mounted, setMounted] = React.useState(false);
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="h-screen bg-[var(--color-background)]" />;
    }

    const sidebarWidth = isCollapsed ? 64 : 240;

    return (
        <div className="h-screen w-full flex relative overflow-hidden bg-[var(--color-background)] gradient-mesh">
            {/* Glass Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: sidebarWidth }}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="h-full flex-shrink-0 flex flex-col relative z-20 glass-panel border-r border-border"
            >
                {/* Logo Section */}
                <div className="flex items-center h-14 px-4 border-b border-white/10">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                            <span className="text-white typo-body-lg">S</span>
                        </div>
                        <AnimatePresence mode="wait">
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="typo-title-lg text-white"
                                >
                                    SenstoSales
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Navigation Section */}
                <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                        return (
                            <Link key={item.key} href={item.href} className="block">
                                <div
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 typo-body-md rounded-xl transition-all duration-200 ease-out",
                                        isActive
                                            ? "bg-primary text-white shadow-lg shadow-primary/30 hover-lift"
                                            : "text-[var(--color-foreground-subtle)] hover:text-white hover:bg-white/10 hover:scale-[1.02] hover-lift"
                                    )}
                                >
                                    <HugeiconsIcon icon={item.icon} className="w-5 h-5 flex-shrink-0" />
                                    {!isCollapsed && (
                                        <span className="whitespace-nowrap">{item.label}</span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Footer - Collapse Toggle */}
                <div className="p-2 border-t border-white/10">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="flex items-center gap-3 px-3 py-2.5 typo-body-md rounded-md text-[var(--color-foreground-subtle)] hover:text-white hover:bg-white/5 transition-all duration-200 w-full"
                    >
                        {isCollapsed ? <HugeiconsIcon icon={ArrowRight02Icon} className="w-5 h-5" /> : <HugeiconsIcon icon={ArrowLeft02Icon} className="w-5 h-5" />}
                        {!isCollapsed && <span>Collapse</span>}
                    </button>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Light Header - Odoo Style */}
                <header className="h-14 glass-header sticky top-0 z-30 shadow-sm flex items-center px-4">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                            <GlobalSearch />
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <TooltipProvider>
                            {/* Delivery Alerts Badge */}
                            <DeliveryAlertsBadge />

                            {/* Delivery Tracker Shortcut */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href="/delivery-tracker"
                                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-sunken transition-colors"
                                    >
                                        <HugeiconsIcon icon={PackageIcon} className="w-5 h-5" />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>Delivery Tracker</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* User Avatar */}
                        <div className="flex items-center gap-3 ml-2">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-white typo-body-md">AM</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="typo-body-md">Abhijit</span>
                                <span className="typo-body-sm text-muted">Administrator</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    <ErrorBoundary>
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                            className="max-w-[1400px] mx-auto"
                        >
                            {children}
                        </motion.div>
                    </ErrorBoundary>
                </main>
            </div>
        </div>
    );
}
