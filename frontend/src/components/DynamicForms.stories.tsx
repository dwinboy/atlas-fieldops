import type { Meta, StoryObj } from "@storybook/react";

import { DynamicForms } from "@/components/DynamicForms";

const meta = {
  title: "Workspace/DynamicForms",
  component: DynamicForms,
  parameters: {
    layout: "fullscreen"
  }
} satisfies Meta<typeof DynamicForms>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    token: "preview-token"
  }
};
