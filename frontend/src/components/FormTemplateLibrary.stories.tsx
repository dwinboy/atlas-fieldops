import type { Meta, StoryObj } from "@storybook/react";

import { FormTemplateLibrary } from "@/components/FormTemplateLibrary";

const meta = {
  title: "Workspace/FormTemplateLibrary",
  component: FormTemplateLibrary,
  parameters: {
    layout: "fullscreen"
  }
} satisfies Meta<typeof FormTemplateLibrary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    token: "preview-token"
  }
};
