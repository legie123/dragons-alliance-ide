/// <reference types="vite/client" />
// Asset-uri de brand importabile in renderer (electron-vite/Vite le emite ca URL).
declare module "*.png" {
  const src: string;
  export default src;
}
