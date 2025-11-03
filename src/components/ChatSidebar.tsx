'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useLocalStorage } from '@/lib/hooks';
import { SQLCardItem, Table } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { X, ArrowUp, Paperclip, MessageSquare, Trash2 } from 'lucide-react';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
} from '@/components/ui/input-group';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SQLCard } from './SQLCard';
import { cn } from '@/lib/utils';

interface ChatMessage extends SQLCardItem {
  id: string;
  timestamp: number;
}

interface ChatSidebarProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ChatSidebar({
  isOpen: controlledIsOpen,
  onOpenChange,
}: ChatSidebarProps) {
  const { tables, supabaseApiKey } = useStore();
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange
    ? (value: boolean) => onOpenChange(value)
    : setInternalIsOpen;
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useLocalStorage<ChatMessage[]>(
    'chat-history',
    []
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const tableSchema = useMemo(() => {
    if (listOfTables.length === 0) return '';
    return listOfTables
      .map(
        (table) =>
          `${table?.title}(${table?.columns
            ?.map((i) => `${i.title} ${i.format}`)
            .join(',')})`
      )
      .join('\n#');
  }, [listOfTables]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const generateSQL = async () => {
    if (!query.trim()) return;

    const messageId = Date.now().toString();
    const newMessage: ChatMessage = {
      id: messageId,
      query: query,
      result: '',
      timestamp: Date.now(),
    };

    setChatHistory((prev) => [...prev, newMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      // Handle file attachments if any
      let fileData = '';
      if (selectedFiles.length > 0) {
        // For images, convert to base64 or description
        const filePromises = selectedFiles.map((file) => {
          return new Promise<string>((resolve) => {
            if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (e) => {
                resolve(`Image: ${file.name} (base64 data)`);
              };
              reader.readAsDataURL(file);
            } else {
              resolve(`File: ${file.name} (${file.type})`);
            }
          });
        });
        const fileDescriptions = await Promise.all(filePromises);
        fileData = '\nAttached files:\n' + fileDescriptions.join('\n');
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schema: tableSchema,
          query: query + fileData,
          chatHistory: chatHistory.map((msg) => ({
            role: 'user',
            content: msg.query,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = response.body;
      if (!data) {
        return;
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let result = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        result += chunkValue;

        setChatHistory((prev) => {
          const updated = [...prev];
          const messageIndex = updated.findIndex((m) => m.id === messageId);
          if (messageIndex !== -1) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              result: result,
            };
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Error generating SQL:', err);
      setChatHistory((prev) => {
        const updated = [...prev];
        const messageIndex = updated.findIndex((m) => m.id === messageId);
        if (messageIndex !== -1) {
          updated[messageIndex] = {
            ...updated[messageIndex],
            result: 'Error: Failed to generate SQL. Please try again.',
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateSQL();
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    setQuery('');
    setSelectedFiles([]);
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-0 z-[9999] h-full w-[420px] bg-background border-l shadow-2xl transition-transform duration-300 ease-in-out flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} />
            <h2 className="font-semibold text-lg">SQL AI Assistant</h2>
            {chatHistory.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {chatHistory.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {chatHistory.length > 0 && (
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
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.length === 0 ? (
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
            chatHistory.map((item) => (
              <SQLCard
                key={item.id}
                item={item}
                onDelete={() => {
                  setChatHistory((prev) =>
                    prev.filter((msg) => msg.id !== item.id)
                  );
                }}
              />
            ))
          )}
          {isLoading && (
            <div className="text-sm text-muted-foreground animate-pulse">
              Generating SQL...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
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
              onSubmit={(e) => {
                e.preventDefault();
                generateSQL();
              }}
            >
              <Field>
                <FieldLabel htmlFor="chat-input" className="sr-only">
                  Chat Input
                </FieldLabel>
                <InputGroup>
                  <InputGroupTextarea
                    id="chat-input"
                    ref={textareaRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask, search, or make anything..."
                    rows={3}
                    disabled={isLoading}
                  />
                  <InputGroupAddon align="block-end" className="gap-1">
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
                        <InputGroupButton
                          type="button"
                          size="icon"
                          className="rounded-full h-8 w-8"
                          aria-label="Attach file"
                          onClick={handleFileButtonClick}
                          disabled={isLoading}
                        >
                          <Paperclip size={16} />
                        </InputGroupButton>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Attach file or image</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InputGroupButton
                          type="submit"
                          aria-label="Send"
                          className="rounded-full h-8 w-8"
                          variant="default"
                          size="icon"
                          disabled={isLoading || !query.trim()}
                        >
                          <ArrowUp size={16} />
                        </InputGroupButton>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Send message</p>
                      </TooltipContent>
                    </Tooltip>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </form>
          </TooltipProvider>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
