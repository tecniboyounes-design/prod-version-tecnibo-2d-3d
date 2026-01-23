// src/cloudflare/api/http.js
import axios from 'axios';

/**
 * Axios instance used by the Cloudflare client.
 * Base URL is your Next.js API (same origin). Override with NEXT_PUBLIC_API_BASE if needed.
 */
const baseURL =
  (typeof window !== 'undefined' && process?.env?.NEXT_PUBLIC_API_BASE) || '';

export const http = axios.create({
  baseURL,
  timeout: 30_000,
  withCredentials: false,
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      'Network error';
    return Promise.reject(new Error(msg));
  }
);
