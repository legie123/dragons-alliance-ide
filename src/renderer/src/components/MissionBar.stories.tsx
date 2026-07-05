import type { Meta, StoryObj } from "@storybook/react-vite";
import { MissionBar } from "./MissionBar";

const meta = {
  title: "Command/MissionBar",
  component: MissionBar,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: 180, padding: 24, background: "var(--bg)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MissionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithProjects: Story = {
  args: {
    projects: [
      {
        name: "dragons-alliance-ide",
        path: "/Users/user/code/dragons-alliance-ide",
        type: "git",
        branch: "feat/ux-evolution",
        dirty: 4,
        remote: null,
        terminals: [],
        session: null,
      },
      {
        name: "dragons-alliance-web",
        path: "/Users/user/code/dragons-alliance-web",
        type: "git",
        branch: "main",
        dirty: 0,
        remote: null,
        terminals: [],
        session: null,
      },
      {
        name: "recruitment",
        path: "/Users/user/code/dragons-alliance-recruitment",
        type: "git",
        branch: "feature/dip",
        dirty: 2,
        remote: null,
        terminals: [],
        session: null,
      },
    ],
  },
};
