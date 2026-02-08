"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    Invoice01Icon,
    DeliveryTruck01Icon,
    Invoice03Icon,
    PackageIcon,
    ArrowRight01Icon,
    Link02Icon,
    Loading03Icon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn, formatDate } from "@/lib/utils";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    Button,
    Flex
} from "@/components/common";
import { Label, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { LinkedDocument } from "@/types";

interface LinkedDocsPopoverProps {
    docType: string;
    docNumber: string;
    trigger?: React.ReactNode;
}

export function LinkedDocsPopover({ docType, docNumber, trigger }: LinkedDocsPopoverProps) {
    const [docs, setDocs] = useState<LinkedDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<Error | string | null>(null);

    const fetchDocs = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch from API
            const res = await api.getLinkedDocuments(docType, docNumber);

            if (Array.isArray(res) && res.length > 0) {
                setDocs(res);
            } else {
                // FALLBACK: If API returns empty, we might have documents that haven't been 'officially' linked in the intelligence_ledger yet
                // but are linked via foreign keys in the DB.
                setDocs([]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchDocs();
        }
    }, [open]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <HugeiconsIcon icon={Link02Icon} className="w-4 h-4 mr-2" />
                        Linked Chain ({docs.length})
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 overflow-hidden" align="end">
                <div className="p-3 border-b border-border/40 bg-surface-sunken/30">
                    <Label className="text-tertiary typo-label-md">
                        Document Genealogy
                    </Label>
                </div>

                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 flex flex-col items-center justify-center gap-2">
                            <HugeiconsIcon icon={Loading03Icon} className="w-6 h-6 animate-spin text-primary" />
                            <Text size="xs" variant="subtle" className="italic typo-body-sm">Traceroute in progress...</Text>
                        </div>
                    ) : docs.length > 0 ? (
                        <div className="divide-y divide-border/20">
                            {docs.map((link) => {
                                const isSource = link.source_doc_number === docNumber && link.source_doc_type.toUpperCase() === docType.toUpperCase();
                                const displayDoc = isSource
                                    ? { type: link.target_doc_type, number: link.target_doc_number }
                                    : { type: link.source_doc_type, number: link.source_doc_number };

                                const type = displayDoc.type.toLowerCase();
                                let Icon = Invoice01Icon;
                                if (type === "dc") Icon = DeliveryTruck01Icon;
                                else if (type === "srv") Icon = PackageIcon;
                                else if (type === "invoice") Icon = Invoice03Icon;

                                return (
                                    <Link
                                        key={link.id}
                                        href={`/${type === "invoice" ? "invoice" : type}/${displayDoc.number}`}
                                        className="flex items-center gap-2 py-1.5 px-3 hover:bg-surface-sunken transition-colors group"
                                    >
                                        <div className="size-7 rounded-md bg-primary/5 flex items-center justify-center border border-primary/10">
                                            <HugeiconsIcon icon={Icon} className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="typo-label-md text-primary">
                                                    {displayDoc.type}
                                                </span>
                                                <span className="typo-body-md truncate">
                                                    {displayDoc.number}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="typo-body-sm text-tertiary">
                                                {(() => {
                                                    const safeDate = link.doc_date ?? link.created_at ?? null;
                                                    return safeDate ? formatDate(safeDate).split(',')[0] : '-';
                                                })()}
                                            </span>
                                        </div>
                                        <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-tertiary group-hover:text-primary transition-colors shrink-0" />
                                    </Link>
                                );
                            })}
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-error/5 border border-error/20 rounded-lg m-3">
                            <Text size="xs" variant="subtle" className="block mb-1 text-error typo-body-sm">Error loading links</Text>
                            <Text size="xs" variant="subtle" className="opacity-60 typo-body-sm">{String(error)}</Text>
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <Text size="xs" variant="subtle" className="block mb-1 typo-body-sm">No links found</Text>
                            <Text size="xs" variant="subtle" className="opacity-60 typo-body-sm">This document is currently isolated.</Text>
                        </div>
                    )}                </div>
            </PopoverContent>
        </Popover>
    );
}
