"use client";

import React from "react";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { NotificationsView } from "@/components/notifications/NotificationsView";

export default function NotificationsPage() {
  return (
    <PageContainer width="narrow">
      <PageHeader
        backHref="/customer"
        title="Notifications"
        description="Quotes, booking milestones and receipts — in one place."
      />
      <NotificationsView />
    </PageContainer>
  );
}
