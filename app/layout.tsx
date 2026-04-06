import "../src/app/globals.css";

import type { ReactNode } from "react";

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="ka">
      <body>{props.children}</body>
    </html>
  );
}
