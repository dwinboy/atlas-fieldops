import type { Meta, StoryObj } from "@storybook/react";

import { AuthPanel } from "@/components/AuthPanel";

const meta = {
  title: "Workspace/AuthPanel",
  component: AuthPanel,
  parameters: {
    layout: "fullscreen"
  },
  args: {
    onAuthenticated: () => undefined
  }
} satisfies Meta<typeof AuthPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

