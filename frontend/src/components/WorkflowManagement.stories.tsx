import type { Meta, StoryObj } from "@storybook/react";

import { WorkflowManagement } from "@/components/WorkflowManagement";

const meta = {
  title: "Workspace/WorkflowManagement",
  component: WorkflowManagement,
  parameters: {
    layout: "fullscreen"
  }
} satisfies Meta<typeof WorkflowManagement>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

