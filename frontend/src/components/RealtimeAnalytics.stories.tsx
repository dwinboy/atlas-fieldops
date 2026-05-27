import type { Meta, StoryObj } from "@storybook/react";

import { RealtimeAnalytics } from "@/components/RealtimeAnalytics";

const meta = {
  title: "Workspace/RealtimeAnalytics",
  component: RealtimeAnalytics,
  parameters: {
    layout: "fullscreen"
  }
} satisfies Meta<typeof RealtimeAnalytics>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

