"use client";
import React from "react";
import { Heading, Text } from "@/components/ui";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "./Button";


interface DocumentTemplateProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    onBack?: () => void;
    layoutId?: string;
    icon?: React.ReactNode;
    iconLayoutId?: string;
    headerAction?: React.ReactNode;
}

export const DocumentTemplate = ({
    title,
    description,
    actions,
    headerAction,
    children,
    className,
    onBack,
    layoutId,
    icon,
    iconLayoutId,
}: DocumentTemplateProps) => {
    return (
        <div className={cn("w-full pt-2 pb-6 bg-transparent relative min-h-full", className)}>

            <div className="relative z-10 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <Button
                                variant="secondary"
                                onClick={onBack}
                                className="h-10 w-10 p-0 rounded-xl transition-all bg-surface shadow-sm border border-border-default text-muted hover:bg-surface-sunken"
                            >
                                <HugeiconsIcon icon={ArrowLeft02Icon} className="w-5 h-5" />
                            </Button>
                        )}
                        <div className="flex flex-col gap-1">
                            {typeof title === 'string' ? (
                                <Heading as="h1">{title}</Heading>
                            ) : (
                                title
                            )}
                            {description && (
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <div className="typo-body-sm text-subtle">
                                        {description}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                    <div className="flex items-center gap-4">
                        {headerAction && (
                            <div className="ml-6 pl-6 bg-border-default/10 w-px h-8 flex items-center self-center" />
                        )}
                        {headerAction && <div>{headerAction}</div>}
                        {actions && (
                            <div className="flex items-center gap-4">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="w-full h-full flex-1 flex flex-col">
                    {children}
                </div>
            </div>
        </div>
    );
};
