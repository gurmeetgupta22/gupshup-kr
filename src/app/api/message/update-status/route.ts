import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(request: Request) {
  try {
    const { action, messageIds, userId, chatId } = await request.json();
    if (!action || !messageIds || !Array.isArray(messageIds) || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // If no messages to process, return immediately without touching last_read_at.
    // This is critical: if all messages are already read, we must NOT reset last_read_at to now(),
    // which would cause "seen just now" to appear for messages that were read long ago.
    if (messageIds.length === 0) {
      return NextResponse.json({ success: true });
    }

    // Fetch the messages
    const { data: messagesData, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('id, read_by, delivered_to')
      .in('id', messageIds);

    if (fetchError || !messagesData) {
      return NextResponse.json({ error: fetchError?.message || 'Messages not found' }, { status: 500 });
    }

    // Perform the updates on messages using admin client to bypass RLS
    let anyActuallyUpdated = false;
    for (const msg of messagesData) {
      if (action === 'deliver') {
        const deliveredTo = msg.delivered_to || [];
        if (!deliveredTo.includes(userId)) {
          const newDelivered = [...new Set([...deliveredTo, userId])];
          await supabaseAdmin
            .from('messages')
            .update({ delivered_to: newDelivered })
            .eq('id', msg.id);
          anyActuallyUpdated = true;
        }
      } else if (action === 'read') {
        const readBy = msg.read_by || [];
        const deliveredTo = msg.delivered_to || [];
        
        const updates: any = {};
        if (!readBy.includes(userId)) {
          updates.read_by = [...new Set([...readBy, userId])];
        }
        // If it's read, it must also be delivered
        if (!deliveredTo.includes(userId)) {
          updates.delivered_to = [...new Set([...deliveredTo, userId])];
        }

        if (Object.keys(updates).length > 0) {
          await supabaseAdmin
            .from('messages')
            .update(updates)
            .eq('id', msg.id);
          anyActuallyUpdated = true;
        }
      }
    }

    // Only update last_read_at if we actually marked at least one message as newly read.
    // If all messages were already read, preserve the original last_read_at timestamp so
    // "seen x ago" continues to show the correct original time.
    if (action === 'read' && chatId && anyActuallyUpdated) {
      await supabaseAdmin
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', userId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
