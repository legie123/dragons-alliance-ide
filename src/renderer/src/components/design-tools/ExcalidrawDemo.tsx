import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

export function ExcalidrawDemo() {
  return (
    <div className="design-demo-canvas" aria-label="Excalidraw demo canvas">
      <Excalidraw
        initialData={{
          elements: [],
          appState: {
            name: "Dragons Alliance Fiber",
            viewBackgroundColor: "#12080d",
          },
        }}
      />
    </div>
  );
}
