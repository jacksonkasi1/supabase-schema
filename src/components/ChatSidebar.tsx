'use client';

// ** import types
import type { Table } from '@/lib/types';

// ** import core packages
import { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

// ** import utils
import { useStore } from '@/lib/store';
import { useLocalStorage } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ** import ui components
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  X,
  ArrowUp,
  Paperclip,
  MessageSquare,
  Trash2,
  Clipboard,
  Link,
  Cloud,
} from 'lucide-react';
import { Field, FieldLabel } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatSidebarProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface Model {
  id: string;
  name: string;
  enabled?: boolean;
}

export function ChatSidebar({
  isOpen = false,
  onOpenChange,
}: ChatSidebarProps) {
  const { tables, updateTablesFromAI, supabaseApiKey } = useStore();
  const [aiProvider, setAiProvider] = useLocalStorage<'openai' | 'google'>(
    'ai-provider',
    'openai',
  );
  const [openaiApiKey] = useLocalStorage<string>('ai-openai-key', '');
  const [googleApiKey] = useLocalStorage<string>('ai-google-key', '');
  const [openaiModel, setOpenaiModel] = useLocalStorage<string>(
    'ai-openai-model',
    'gpt-4o-mini',
  );
  const [googleModel, setGoogleModel] = useLocalStorage<string>(
    'ai-google-model',
    'gemini-1.5-pro-latest',
  );

  // Load models from local storage
  const [openaiModels] = useLocalStorage<Model[]>('ai-openai-models', []);
  const [googleModels] = useLocalStorage<Model[]>('ai-google-models', []);
  const [customOpenaiModels] = useLocalStorage<string[]>(
    'ai-custom-openai-models',
    [],
  );
  const [customGoogleModels] = useLocalStorage<string[]>(
    'ai-custom-google-models',
    [],
  );

  // Combine built-in (if fetched) + custom + default fallback
  const availableOpenaiModels = useMemo(() => {
    // Filter out disabled models
    const models = openaiModels.filter((m) => m.enabled !== false);

    // Add custom models
    customOpenaiModels.forEach((m) => {
      if (!models.find((existing) => existing.id === m)) {
        models.push({ id: m, name: m, enabled: true });
      }
    });
    // Ensure default exists if list is empty
    if (models.length === 0) {
      models.push({ id: 'gpt-4o-mini', name: 'GPT-4o mini', enabled: true });
      models.push({ id: 'gpt-4o', name: 'GPT-4o', enabled: true });
    }
    return models;
  }, [openaiModels, customOpenaiModels]);

  const availableGoogleModels = useMemo(() => {
    const models = googleModels.filter((m) => m.enabled !== false);

    customGoogleModels.forEach((m) => {
      if (!models.find((existing) => existing.id === m)) {
        models.push({ id: m, name: m, enabled: true });
      }
    });
    if (models.length === 0) {
      models.push({
        id: 'gemini-1.5-pro-latest',
        name: 'Gemini 1.5 Pro',
        enabled: true,
      });
      models.push({
        id: 'gemini-1.5-flash-latest',
        name: 'Gemini 1.5 Flash',
        enabled: true,
      });
    }
    return models;
  }, [googleModels, customGoogleModels]);

  const setIsOpen = (value: boolean) => {
    onOpenChange?.(value);
  };

  // Manage input state manually (AI SDK 5 pattern)
  const [input, setInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Create transport with configuration (without schema - it's passed per message)
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: {
          provider: aiProvider === 'google' ? 'google' : 'openai',
          apiKey: aiProvider === 'google' ? googleApiKey : openaiApiKey,
          model: aiProvider === 'google' ? googleModel : openaiModel,
          // schema is NOT included here - it's passed per message to avoid stale state
        },
      }),
    [aiProvider, googleApiKey, openaiApiKey, googleModel, openaiModel],
  );

  // Log schema sent to API for debugging
  useEffect(() => {
    console.log(
      '[ChatSidebar] Current tables state:',
      Object.keys(tables).length,
      'tables',
    );
  }, [tables]);

  // Use Vercel AI SDK 5's useChat hook
  const { messages, sendMessage, status, setMessages } = useChat({
    id: 'sql-assistant',
    transport,
    onFinish: ({ message }) => {
      console.log('[onFinish] Processing message:', {
        id: message.id,
        role: message.role,
        partCount: message.parts.length,
        partTypes: message.parts.map((p: any) => p.type),
      });

      let toolsExecuted = 0;
      let schemaUpdated = false;

      message.parts.forEach((part: any, index: number) => {
        // Check if this is any tool call
        if (part.type?.startsWith('tool-')) {
          toolsExecuted++;

          console.log(`[onFinish] Tool ${toolsExecuted} (Part ${index}):`, {
            type: part.type,
            state: part.state,
            hasOutput: !!part.output,
            hasResult: !!part.result,
            outputKeys: part.output ? Object.keys(part.output) : [],
            resultKeys: part.result ? Object.keys(part.result) : [],
          });
        }

        // Check for modifySchema tool - handle different possible structures
        const isModifyTool =
          part.type === 'tool-modifySchema' ||
          (part.type?.startsWith('tool-') && part.toolName === 'modifySchema');

        if (!isModifyTool) return;

        // Handle different output structures (SDK may use 'output' or 'result')
        const output = part.output || part.result;

        // Check if output contains tables
        if (output && typeof output === 'object' && 'tables' in output) {
          const tableCount = Object.keys(output.tables).length;
          const operationCount = Array.isArray(output.operationsApplied)
            ? output.operationsApplied.length
            : 0;

          console.log(`[onFinish] 🎯 Applying schema update:`, {
            tableCount,
            operationCount,
            operations: output.operationsApplied,
          });

          // Update the Zustand store with new tables
          updateTablesFromAI(output.tables);
          schemaUpdated = true;

          // Show success toast with details
          toast.success('Schema updated successfully', {
            description:
              operationCount > 0
                ? `${operationCount} operation${operationCount === 1 ? '' : 's'} applied • ${tableCount} table${tableCount === 1 ? '' : 's'} in workspace`
                : `${tableCount} table${tableCount === 1 ? '' : 's'} in workspace`,
          });
        } else {
          console.warn(
            '[onFinish] modifySchema tool found but no valid output:',
            {
              hasOutput: !!output,
              outputType: typeof output,
              hasTables: output && 'tables' in output,
            },
          );
        }
      });

      console.log('[onFinish] Summary:', {
        toolsExecuted,
        schemaUpdated,
        finalTableCount: Object.keys(tables).length,
      });

      if (toolsExecuted > 0 && !schemaUpdated) {
        console.log(
          '[onFinish] ⚠️ Tools executed but no schema updates detected',
        );
      }
    },
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error('Assistant request failed', {
        description: error.message,
      });
    },
  });

  // Compute isLoading from status
  const isLoading = status === 'streaming' || status === 'submitted';

  const listOfTables = useMemo(() => {
    const authUserTable: Table = {
      title: 'auth.users',
      columns: [
        { title: 'id', format: 'uuid', type: 'string' },
        { title: 'email', format: 'varchar', type: 'string' },
      ],
    };

    const hasRealTables = Object.keys(tables).length > 0;
    if (hasRealTables) {
      const tablesList = Object.entries(tables)
        .map(([, value]) => (value.is_view ? undefined : value))
        .filter(Boolean) as Table[];
      tablesList.push(authUserTable);
      return tablesList;
    }
    return [];
  }, [tables]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const provider = aiProvider === 'google' ? 'google' : 'openai';
    const apiKey = provider === 'google' ? googleApiKey : openaiApiKey;

    if (!apiKey) {
      toast.error('Missing API key', {
        description:
          provider === 'google'
            ? 'Add your Google Gemini API key in Settings.'
            : 'Add your OpenAI API key in Settings.',
      });
      return;
    }

    if (!input.trim()) return;

    // CRITICAL: Read FRESH state from Zustand, not closure-captured value
    // Similar to Cline's pattern: "messages = await this.contextManager.getMessages()"
    // This ensures we always send current state, even if React hasn't re-rendered yet
    const currentTables = useStore.getState().tables;
    const schemaTableCount = Object.keys(currentTables).length;
    console.log(
      `[ChatSidebar] 📤 Sending message with ${schemaTableCount} tables in schema (fresh read)`,
    );

    await sendMessage(
      { text: input },
      {
        body: {
          schema: currentTables, // ✅ Fresh state from store, not stale closure
          attachments: selectedFiles.map((file) => ({
            name: file.name,
            type: file.type,
          })),
          // Explicitly pass fresh config to ensure it overrides stale transport state
          provider,
          apiKey,
          model: provider === 'google' ? googleModel : openaiModel,
        },
      },
    );

    // Clear input and files after submission
    setInput('');
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSelectedFiles([]);
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleModelChange = (value: string) => {
    // Check if it's an OpenAI model
    if (availableOpenaiModels.some((m) => m.id === value)) {
      setAiProvider('openai');
      setOpenaiModel(value);
    } else if (availableGoogleModels.some((m) => m.id === value)) {
      setAiProvider('google');
      setGoogleModel(value);
    }
  };

  const currentModelValue = aiProvider === 'google' ? googleModel : openaiModel;

  return (
    <div
      className={cn(
        'fixed top-0 right-0 h-full w-[420px] z-[60]',
        'bg-background/95 backdrop-blur-xl',
        'border-l border-border',
        'shadow-[-3px_0_8px_-1px_rgba(0,0,0,0.04)] dark:shadow-[-3px_0_10px_-1px_rgba(0,0,0,0.12)]',
        'transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} />
          <h2 className="font-semibold text-lg">SQL AI Assistant</h2>
          {messages.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {messages.filter((m) => m.role === 'user').length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearChat}
                    className="h-8 w-8"
                  >
                    <Trash2 size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear Chat History</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsOpen(false);
            }}
            className="h-8 w-8"
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto p-4 space-y-4 h-[calc(100vh-10rem)]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageSquare size={48} className="mb-4 opacity-50" />
            <p className="text-sm">Start a conversation to generate SQL</p>
            {listOfTables.length > 0 && (
              <div className="mt-4">
                <p className="text-xs mb-2">Available tables:</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {listOfTables.slice(0, 6).map((table) => (
                    <Badge
                      key={table.title}
                      variant="outline"
                      className="text-xs"
                    >
                      {table.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={message.id} className="space-y-2">
                {message.role === 'user' ? (
                  /* User message - circular bubble */
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-full px-4 py-2 max-w-[80%]">
                      <p className="text-sm">
                        {message.parts
                          .filter((p: any) => p.type === 'text')
                          .map((p: any) => p.text)
                          .join('')}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Assistant response - simple rounded box */
                  <div className="flex justify-start">
                    <div className="bg-muted/50 rounded-2xl px-4 py-3 max-w-[85%] space-y-3">
                      {/* Render text parts */}
                      {message.parts.filter((p: any) => p.type === 'text')
                        .length > 0 ? (
                        message.parts.map((part: any, partIndex: number) => {
                          if (part.type === 'text') {
                            return (
                              <div
                                key={partIndex}
                                className="text-sm whitespace-pre-wrap"
                              >
                                {part.text || (
                                  <span className="text-muted-foreground animate-pulse">
                                    Thinking...
                                  </span>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          Tool executed (no text response generated)
                        </div>
                      )}

                      {/* Show tool invocations if any */}
                      {message.parts.some((p: any) => p.type === 'tool') && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {message.parts
                            .filter((part: any) => part.type === 'tool')
                            .map((tool: any, toolIndex: number) => (
                              <div
                                key={toolIndex}
                                className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1"
                              >
                                <span
                                  className={cn(
                                    'inline-flex h-2 w-2 rounded-full',
                                    tool.result
                                      ? 'bg-emerald-500'
                                      : 'bg-amber-500 animate-pulse',
                                  )}
                                />
                                <span className="font-medium">
                                  {tool.toolName}
                                </span>
                                <span className="capitalize text-muted-foreground">
                                  {tool.result ? 'completed' : 'running'}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      {message.parts.some((p: any) => p.type === 'text') && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Copy"
                            onClick={async () => {
                              const textContent = message.parts
                                .filter((p: any) => p.type === 'text')
                                .map((p: any) => p.text)
                                .join('\n');
                              await navigator.clipboard.writeText(textContent);
                              toast.success('Copied to clipboard');
                            }}
                          >
                            <Clipboard size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Open SQL Editor"
                            onClick={async () => {
                              const textContent = message.parts
                                .filter((p: any) => p.type === 'text')
                                .map((p: any) => p.text)
                                .join('\n');
                              await navigator.clipboard.writeText(textContent);
                              try {
                                const projectRef = new URL(
                                  supabaseApiKey.url,
                                ).hostname.split('.')[0];
                                window.open(
                                  `https://app.supabase.com/project/${projectRef}/sql`,
                                  '_blank',
                                );
                              } catch (error) {
                                console.error('Failed to open SQL tab:', error);
                              }
                            }}
                          >
                            <Link size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-auto text-destructive hover:text-destructive"
                            title="Remove"
                            onClick={() => {
                              setMessages(
                                messages.filter((_, i) => i !== index),
                              );
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {isLoading && (
          <div className="text-sm text-muted-foreground animate-pulse">
            Generating response...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50 bg-background/95 backdrop-blur-xl">
        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                <span className="text-xs truncate max-w-[120px]">
                  {file.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 rounded-full"
                  onClick={() => removeFile(index)}
                >
                  <X size={10} />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Input Form */}
        <TooltipProvider>
          <form
            onSubmit={onSubmit}
            className="relative flex min-h-[120px] flex-col rounded-2xl border border-border shadow-lg bg-card focus-within:ring-1 focus-within:ring-ring transition-all duration-200"
          >
            <div className="flex-1 relative overflow-y-auto max-h-[200px]">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask, search, or make anything..."
                className="w-full border-0 p-3 shadow-none ring-0 ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none resize-none bg-transparent min-h-[80px] text-[15px]"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center gap-2 p-2 pb-2 mt-auto">
              <Select
                value={currentModelValue}
                onValueChange={handleModelChange}
              >
                <SelectTrigger className="h-8 border border-input bg-background rounded-full pl-3 pr-1 py-1.5 text-xs text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus:ring-0 focus:ring-offset-0 transition-colors gap-1.5 w-auto inline-flex items-center justify-between">
                  <SelectValue className="text-sm" />
                </SelectTrigger>
                <SelectContent>
                  {availableOpenaiModels.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
                        OpenAI
                      </SelectLabel>
                      {availableOpenaiModels.map((m) => (
                        <SelectItem key={`openai-${m.id}`} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {availableGoogleModels.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
                        Google
                      </SelectLabel>
                      {availableGoogleModels.map((m) => (
                        <SelectItem key={`google-${m.id}`} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>

              <div className="ml-auto flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.sql,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={handleFileButtonClick}
                      disabled={isLoading}
                    >
                      <Paperclip size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach file</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      size="icon"
                      className={cn(
                        'h-8 w-8 rounded-full transition-all duration-200',
                        input.trim()
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted text-muted-foreground',
                      )}
                      disabled={isLoading || !input.trim()}
                    >
                      <ArrowUp size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send message</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </form>
        </TooltipProvider>
      </div>
    </div>
  );
}
