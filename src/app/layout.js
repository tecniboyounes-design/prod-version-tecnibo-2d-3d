'use client';
import { Provider } from 'react-redux';
import store from '@/store'; 
import '@/app/styles/main.css'
import './styles/main.css'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Provider store={store}>
          {children}
        </Provider>
      </body>
    </html>
  );
}
