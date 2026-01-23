// /src/app/convert-any-panel/page.js

import React from 'react';
import ConvertAnyPanel from './clientCadPipline';
// 👇 fix this path/name to match the actual filename you created

export const metadata = {
  title: 'Convert Any — CAD Pipeline',
  description: 'DWG/DXF → any supported format via CloudConvert, with geometry extraction.',
};

export default function Page() {
  return (
    <>
      <ConvertAnyPanel />
    </>
  );
}
