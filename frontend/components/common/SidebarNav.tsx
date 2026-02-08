"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    DashboardSquare01Icon,
    CheckListIcon,
    DeliveryTruck01Icon,
    Invoice01Icon,
    TaskDone01Icon,
    Analytics01Icon,
    SecurityCheckIcon,
    Settings01Icon
} from "@hugeicons/core-free-icons";

interface NavItem {
    name: string;
    href: string;
    icon: any;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    {
        label: "Operations",
        items: [
            { name: "Dashboard", href: "/", icon: DashboardSquare01Icon },
            { name: "Orders", href: "/po", icon: CheckListIcon },
            { name: "Sourcing", href: "/procurement", icon: Analytics01Icon },
            { name: "Delivery", href: "/dc", icon: DeliveryTruck01Icon },
            { name: "Invoices", href: "/invoice", icon: Invoice01Icon },
            { name: "Receipts", href: "/srv", icon: TaskDone01Icon },
            { name: "Reports", href: "/reports", icon: Analytics01Icon },
        ],
    },
    {
        label: "System",
        items: [
            { name: "Audit Logs", href: "/system/ledger", icon: SecurityCheckIcon },
            { name: "Settings", href: "/settings", icon: Settings01Icon },
        ],
    },
];

export function SidebarNav() {
    const pathname = usePathname();

    return (
        <aside className="flex-shrink-0 flex flex-col w-56 h-full bg-surface border-r border-border">
            {/* Logo Header */}
            <div className="flex items-center px-4 h-12 border-b border-border">
                <Link href="/" className="flex items-center gap-2">
                    {/* Logo Icon - Blue diamond with funnel */}
                    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Blue rounded diamond */}
                        <rect x="4" y="4" width="32" height="32" rx="8" fill="var(--color-primary)" />
                        {/* White funnel icon */}
                        <path d="M12 14h16l-6 8v6l-4-2v-4l-6-8z" fill="white" />
                        {/* Sparkle dots */}
                        <circle cx="30" cy="10" r="2" fill="var(--color-blue-400)" />
                        <circle cx="34" cy="14" r="1.5" fill="var(--color-blue-300)" />
                    </svg>
                    {/* Logo Text */}
                    <span className="typo-title-lg">Senstosales</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-3 overflow-y-auto">
                {navGroups.map((group) => (
                    <div key={group.label} className="mb-4">
                        {/* Section Label */}
                        <div className="px-3 mb-1">
                            <span className="typo-body-sm text-muted">
                                {group.label}
                            </span>
                        </div>

                        {/* Nav Items */}
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== "/" && pathname.startsWith(item.href + "/"));

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center px-4 py-1.5 rounded-md typo-body-md transition-colors",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted hover:text-foreground hover:bg-surface-sunken"
                                        )}
                                    >
                                        <HugeiconsIcon icon={item.icon} className="w-4 h-4 mr-2 text-subtle" />
                                        <span>{item.name}</span>
                                        {isActive && (
                                            <div className="ml-auto w-1 h-1 rounded-full bg-primary" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer Status */}
            <div className="p-3 border-t border-border">
                <div className="flex items-center px-2 py-1.5 rounded-md bg-surface-sunken">
                    <div className="relative mr-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <span className="typo-body-sm text-muted">System Online</span>
                </div>
            </div>
        </aside>
    );
}
