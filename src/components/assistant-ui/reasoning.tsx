'use client';

import { FC, PropsWithChildren, useState } from 'react';
import { ChevronDown, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Shimmer animation for streaming state
const ShimmerEffect: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-purple-500/10 to-transparent',
      className
    )}
  />
);

// Reasoning Root Container
export const ReasoningRoot: FC<
  PropsWithChildren<{ className?: string; defaultOpen?: boolean }>
> = ({ children, className, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        'mb-3 rounded-lg border border-purple-500/20 bg-purple-500/5 overflow-hidden',
        className
      )}
    >
      {children}
    </Collapsible>
  );
};

// Reasoning Trigger (header)
export const ReasoningTrigger: FC<{
  isStreaming?: boolean;
  className?: string;
  label?: string;
}> = ({ isStreaming, className, label }) => {
  return (
    <CollapsibleTrigger
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-sm font-medium',
        'text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors',
        'relative overflow-hidden',
        className
      )}
    >
      {isStreaming && <ShimmerEffect />}
      <Brain
        size={14}
        className={cn(isStreaming && 'animate-pulse', 'relative z-10')}
      />
      <span className="relative z-10">
        {label || (isStreaming ? 'Thinking...' : 'Reasoning')}
      </span>
      {isStreaming && (
        <span className="ml-2 h-2 w-2 rounded-full bg-purple-500 animate-pulse relative z-10" />
      )}
      <ChevronDown
        size={14}
        className="ml-auto transition-transform duration-200 [[data-state=open]>&]:rotate-180 relative z-10"
      />
    </CollapsibleTrigger>
  );
};

// Reasoning Content
export const ReasoningContent: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => {
  return (
    <CollapsibleContent
      className={cn(
        'px-3 pb-3 text-sm text-muted-foreground border-t border-purple-500/10',
        className
      )}
    >
      <div className="pt-2 prose prose-sm dark:prose-invert max-w-none">
        {children}
      </div>
    </CollapsibleContent>
  );
};

// Main Reasoning Component - for single reasoning block
export const Reasoning: FC<{
  text: string;
  isStreaming?: boolean;
  defaultOpen?: boolean;
}> = ({ text, isStreaming = false, defaultOpen = false }) => {
  if (!text && !isStreaming) return null;

  return (
    <ReasoningRoot defaultOpen={defaultOpen || isStreaming}>
      <ReasoningTrigger isStreaming={isStreaming} />
      <ReasoningContent>
        {text ? (
          <div className="whitespace-pre-wrap">{text}</div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="animate-pulse">Processing...</span>
          </div>
        )}
      </ReasoningContent>
    </ReasoningRoot>
  );
};

// Reasoning Group - for consecutive reasoning parts
export const ReasoningGroup: FC<
  PropsWithChildren<{
    startIndex: number;
    endIndex: number;
    isStreaming?: boolean;
  }>
> = ({ startIndex, endIndex, isStreaming, children }) => {
  const [isOpen, setIsOpen] = useState(isStreaming ?? false);
  const count = endIndex - startIndex + 1;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-3 rounded-lg border border-purple-500/20 bg-purple-500/5 overflow-hidden"
    >
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-sm font-medium',
          'text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors',
          'relative overflow-hidden'
        )}
      >
        {isStreaming && <ShimmerEffect />}
        <Brain
          size={14}
          className={cn(isStreaming && 'animate-pulse', 'relative z-10')}
        />
        <span className="relative z-10">
          {isStreaming
            ? 'Thinking...'
            : `Reasoning (${count} step${count > 1 ? 's' : ''})`}
        </span>
        {isStreaming && (
          <span className="ml-2 h-2 w-2 rounded-full bg-purple-500 animate-pulse relative z-10" />
        )}
        <ChevronDown
          size={14}
          className="ml-auto transition-transform duration-200 [[data-state=open]>&]:rotate-180 relative z-10"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 text-sm text-muted-foreground border-t border-purple-500/10">
        <div className="pt-2 space-y-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Single reasoning step within a group
export const ReasoningStep: FC<{
  index: number;
  text: string;
  isStreaming?: boolean;
}> = ({ index, text, isStreaming }) => {
  return (
    <div
      className={cn(
        'flex gap-2 p-2 rounded-md bg-purple-500/5',
        isStreaming && 'animate-pulse'
      )}
    >
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-medium">
        {index}
      </span>
      <div className="flex-1 whitespace-pre-wrap text-sm">{text}</div>
    </div>
  );
};

export default Reasoning;
