import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const { data: configs, error } = await supabase
      .from('scrape_configs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch configs error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch configs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ configs: configs || [] });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, keywords, location, sources, frequency, active } = body;

    if (!user_id || !keywords) {
      return NextResponse.json(
        { error: 'user_id and keywords are required' },
        { status: 400 }
      );
    }

    const newConfig = {
      user_id,
      keywords: Array.isArray(keywords) ? keywords : [keywords],
      location: location || '',
      sources: sources || ['indeed', 'linkedin', 'france-travail'],
      frequency: frequency || 'daily',
      active: active !== false,
      created_at: new Date().toISOString(),
    };

    const { data: config, error } = await supabase
      .from('scrape_configs')
      .insert(newConfig)
      .select()
      .single();

    if (error) {
      console.error('Create config error:', error);
      return NextResponse.json(
        { error: 'Failed to create config', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('scrape_configs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete config error:', error);
      return NextResponse.json(
        { error: 'Failed to delete config', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}