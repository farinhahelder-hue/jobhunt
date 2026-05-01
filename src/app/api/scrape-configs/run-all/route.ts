import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RENDER_SCRAPER_URL = process.env.RENDER_SCRAPER_URL || 'https://jobhunt-y03c.onrender.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Get all active configs for the user
    const { data: configs, error } = await supabase
      .from('scrape_configs')
      .select('*')
      .eq('user_id', user_id)
      .eq('active', true);

    if (error) {
      console.error('Fetch configs error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch configs', details: error.message },
        { status: 500 }
      );
    }

    if (!configs || configs.length === 0) {
      return NextResponse.json({ triggered: 0, errors: ['No active configs found'] });
    }

    const errors: string[] = [];
    let triggered = 0;

    // Trigger scrape for each config
    for (const config of configs) {
      try {
        const scrapePayload = {
          keywords: config.keywords,
          location: config.location,
          sources: config.sources,
          user_id: config.user_id,
        };

        const scrapeResponse = await fetch(`${RENDER_SCRAPER_URL}/scrape`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(scrapePayload),
        });

        if (!scrapeResponse.ok) {
          const errorText = await scrapeResponse.text();
          errors.push(`Config ${config.id}: ${errorText}`);
        } else {
          triggered++;
        }
      } catch (scrapeError) {
        console.error(`Scrape error for config ${config.id}:`, scrapeError);
        errors.push(`Config ${config.id}: ${String(scrapeError)}`);
      }
    }

    return NextResponse.json({
      triggered,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Run-all error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}