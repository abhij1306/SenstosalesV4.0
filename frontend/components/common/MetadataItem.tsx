import React from "react";
import Link from "next/link";
import { Label, Text, Mono } from "@/components/ui";
import { FieldGroup } from "./FieldGroup";
import { cn } from "@/lib/utils";

export interface MetadataItemProps {
    label: string;
    value?: React.ReactNode | string | number | null;
    isCurrency?: boolean;
    editable?: boolean;
    onChange?: (v: any) => void;
    className?: string;
    type?: string;
    href?: string;
    disabled?: boolean;
}

export const MetadataItem = React.memo(function MetadataItem({
    label,
    value,
    isCurrency,
    editable,
    onChange,
    className,
    type = "text",
    href,
    disabled
}: MetadataItemProps) {
    if (editable || disabled) {
        return (
            <FieldGroup
                label={label}
                value={String(value || "")}
                onChange={onChange}
                placeholder={label}
                className={className}
                type={type}
                disabled={disabled}
            />
        );
    }

    const content = isCurrency ? (
        <Mono size="base">{typeof value === 'number' ? value : parseFloat(String(value || 0))}</Mono>
    ) : value;

    const displayElement = href && value ? (
        <Link href={href} className="text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer decoration-primary/30">
            {content}
        </Link>
    ) : content;

    return (
        <div className={cn("flex flex-col gap-0.5", className)}>
            <Label size="sm">{label}</Label>
            <Text className="flex items-center gap-1 min-h-[20px]">
                {displayElement}
            </Text>
        </div>
    );
});
