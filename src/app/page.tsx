'use client';

import { useState } from 'react';
import { Helper } from '@/components/Helper';
import { ChatSidebar } from '@/components/ChatSidebar';
import { FlowCanvas } from '@/components/flow/FlowCanvas';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 transition-all duration-300 ease-in-out"
        )}
      >
        <Helper onChatOpen={() => setIsChatOpen(!isChatOpen)} isChatOpen={isChatOpen} />
        <FlowCanvas />
      </div>
      <ChatSidebar isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
    </div>
  );
}
