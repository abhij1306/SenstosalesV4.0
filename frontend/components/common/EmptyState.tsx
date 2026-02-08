import { HugeiconsIcon } from '@hugeicons/react';
import { HugeiconsProps } from '@hugeicons/react';
import { Heading, Text } from "@/components/ui";
import { cn } from '@/lib/utils';
import React from 'react';

interface EmptyStateProps {
    icon: any; // Type from @hugeicons/core-free-icons
    title: string;
    description: string;
    action?: React.ReactNode;
    className?: string;
    iconSize?: number;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
    iconSize = 32
}: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-12', className)}>
            <div className={cn(
                'mb-4 p-3',
                'rounded-[var(--radius-md)]',
                'bg-muted/50'
            )}>
                <HugeiconsIcon icon={icon} size={iconSize} className="text-tertiary" />
            </div>

            <Heading as="h3" className="mb-2">{title}</Heading>
            <Text size="md" variant="muted" className="mb-4 text-center max-w-md">
                {description}
            </Text>

            {action}
        </div>
    );
}
