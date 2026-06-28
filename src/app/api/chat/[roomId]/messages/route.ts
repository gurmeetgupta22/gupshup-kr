import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Verify user is participant of this chat
    const { data: participant } = await supabaseAdmin
      .from('chat_participants')
      .select('chat_id')
      .eq('chat_id', roomId)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant of this chat' }, { status: 403 });
    }

    // Soft delete all messages in this chat
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ is_deleted: true, content: 'This message was deleted' })
      .eq('chat_id', roomId);

    if (error) {
      console.error('Clear chat error:', error);
      return NextResponse.json({ error: 'Failed to clear chat' }, { status: 500 });
    }

    // Broadcast to other participants
    const channel = supabaseAdmin.channel(`chat:${roomId}`, { config: { broadcast: { self: false } } });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'chat_cleared',
          payload: { roomId }
        });
        channel.unsubscribe();
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Clear chat error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}