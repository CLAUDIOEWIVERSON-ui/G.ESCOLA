import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getSession } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  try {
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .is('deleted_at', null);
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.profile?.role !== 'admin' && session.profile?.role !== 'instrutor')) {
    return NextResponse.json({ error: 'Acesso Negado' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from('cursos')
      .insert([body])
      .select();
    
    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
