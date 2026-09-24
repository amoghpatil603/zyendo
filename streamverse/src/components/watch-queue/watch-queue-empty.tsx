"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";

export default function WatchQueueEmpty(props: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <EmptyState
      icon={props.icon}
      title={props.title}
      description={props.description}
      action={props.action}
    />
  );
}
