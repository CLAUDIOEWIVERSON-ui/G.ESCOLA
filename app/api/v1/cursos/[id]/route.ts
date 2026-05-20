import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getSession, requireInstructorOrAdmin } from '@/lib/auth/rbac';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response } = await requireInstructorOrAdmin();
  if (!authorized) return response!;

  const { id } = await params;
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from('cursos')
      .update(body)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response } = await requireInstructorOrAdmin();
  if (!authorized) return response!;

  const { id } = await params;
  try {
    const { error } = await supabase
      .from('cursos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
    return NextResponse.json({ message: 'Curso excluído com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
