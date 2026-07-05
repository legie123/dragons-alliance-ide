import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

export function TldrawDemo() {
  return (
    <div className="design-demo-canvas" aria-label="tldraw demo canvas">
      <Tldraw persistenceKey="dragons-alliance-design-demo-tldraw" />
    </div>
  );
}
