import { lazy, Suspense, useState } from "react";

const TldrawDemo = lazy(() => import("./TldrawDemo").then((m) => ({ default: m.TldrawDemo })));
const ExcalidrawDemo = lazy(() => import("./ExcalidrawDemo").then((m) => ({ default: m.ExcalidrawDemo })));

type DemoTool = "tldraw" | "excalidraw";

export function DesignToolDemos() {
  const [tool, setTool] = useState<DemoTool>("tldraw");

  return (
    <section className="design-demo">
      <div className="design-demo-head">
        <div>
          <div className="design-demo-kicker">Design labs</div>
          <h3>Dragons Alliance Fiber canvas</h3>
        </div>
        <div className="design-demo-tabs" role="tablist" aria-label="Design demo tool">
          <button className={tool === "tldraw" ? "active" : ""} onClick={() => setTool("tldraw")}>tldraw</button>
          <button className={tool === "excalidraw" ? "active" : ""} onClick={() => setTool("excalidraw")}>Excalidraw</button>
        </div>
      </div>
      <Suspense fallback={<div className="design-demo-loading">Loading design canvas...</div>}>
        {tool === "tldraw" ? <TldrawDemo /> : <ExcalidrawDemo />}
      </Suspense>
    </section>
  );
}
