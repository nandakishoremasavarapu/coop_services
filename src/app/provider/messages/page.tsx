"use client";

import React, { Suspense } from "react";
import { ChatWorkspace, PROVIDER_QUICK_ACTIONS } from "@/components/chat/ChatWorkspace";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { LoadingBlock } from "@/components/ui/states";

function ProviderMessagesContent() {
  return (
    <PageContainer width="full">
      <PageHeader
        title="Messages"
        description="Coordinate with your customers directly in the cooperative channel."
        className="hidden md:block"
      />
      <ChatWorkspace
        role="provider"
        quickActions={PROVIDER_QUICK_ACTIONS}
        messagesHref="/provider/messages"
        orderLink={(bookingId) => `/provider/jobs/${bookingId}`}
      />
    </PageContainer>
  );
}

export default function ProviderMessagesPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Opening messages…" className="py-24" />}>
      <ProviderMessagesContent />
    </Suspense>
  );
}
