"use client";

import React, { Suspense } from "react";
import { ChatWorkspace, CUSTOMER_QUICK_ACTIONS } from "@/components/chat/ChatWorkspace";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { LoadingBlock } from "@/components/ui/states";

function CustomerMessagesContent() {
  return (
    <PageContainer width="full">
      <PageHeader
        title="Messages"
        description="Direct channel with your cooperative specialists."
        className="hidden md:block"
      />
      <ChatWorkspace
        role="customer"
        quickActions={CUSTOMER_QUICK_ACTIONS}
        messagesHref="/customer/messages"
        orderLink={(bookingId) => `/customer/orders/${bookingId}`}
      />
    </PageContainer>
  );
}

export default function CustomerMessagesPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Opening messages…" className="py-24" />}>
      <CustomerMessagesContent />
    </Suspense>
  );
}
