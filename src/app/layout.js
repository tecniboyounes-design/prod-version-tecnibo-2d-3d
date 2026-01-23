'use client';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from '@vercel/analytics/next';
import { Provider } from 'react-redux';
import store from '@/store'; 

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Provider store={store}>
          {children}
          <SpeedInsights />
          <Analytics />
        </Provider>
      </body>
    </html>
  );
}

