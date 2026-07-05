import type { Preview } from "@storybook/react-vite";
import "../src/renderer/src/styles.css";

const noop = () => {};

if (!window.dai) {
  window.dai = {
    term: {
      list: async () => [],
      create: noop,
      write: noop,
      broadcast: async () => ({ sent: 0 }),
    },
    audit: { log: noop },
  } as typeof window.dai;
}

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    backgrounds: {
      default: "command",
      values: [{ name: "command", value: "#060306" }],
    },
  },
};

export default preview;
