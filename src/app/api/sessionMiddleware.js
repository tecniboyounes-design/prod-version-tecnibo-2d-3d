import { getCookie } from '@/lib/cookies';

export function getSessionId(req) {
  return getCookie(req, 'session_id');
}
