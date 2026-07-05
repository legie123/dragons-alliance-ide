import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/renderer/src/**/*.stories.@(ts|tsx)"],
  addons: [],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  staticDirs: ["../src/renderer/src/assets"],
};

export default config;
