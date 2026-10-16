import { NextResponse } from 'next/server';
import { favorites } from '@/lib/favorites_service';
import { getCurrentUser } from '@/lib/supabase_auth';

export const dynamic = 'force-dynamic';

// أرقام مفضلة المستخدم الحالي (للزر القلب في البطاقات). الزائر يحصل على قائمة فارغة
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' };
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ auth: false, ids: [] }, { headers });
  try {
    return NextResponse.json({ auth: true, ids: await favorites.listIds(user.id) }, { headers });
  } catch {
    return NextResponse.json({ auth: true, ids: [] }, { status: 500, headers });
  }
}
