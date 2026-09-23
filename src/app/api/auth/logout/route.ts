import { destroySession } from '@/lib/auth';
import { json, handleError } from '@/lib/api';

export async function POST() {
  try {
    await destroySession();
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
