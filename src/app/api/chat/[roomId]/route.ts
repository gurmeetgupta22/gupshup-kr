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

    // Clean up dependent rows first in case there's no ON DELETE CASCADE set up
    const { data: msgRows } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('chat_id', roomId);
    const messageIds = (msgRows || []).map((m) => m.id);

    if (messageIds.length > 0) {
      await supabaseAdmin.from('message_reactions').delete().in('message_id', messageIds);
      await supabaseAdmin.from('deleted_messages').delete().in('message_id', messageIds);
    }

    // Delete all messages in this chat
    const { error: msgError } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('chat_id', roomId);

    if (msgError) {
      console.error('Delete messages error:', msgError);
      return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 });
    }

    // Delete chat participants
    const { error: partError } = await supabaseAdmin
      .from('chat_participants')
      .delete()
      .eq('chat_id', roomId);

    if (partError) {
      console.error('Delete participants error:', partError);
      return NextResponse.json({ error: 'Failed to delete participants' }, { status: 500 });
    }

    // Delete the chat itself
    const { error: chatError } = await supabaseAdmin
      .from('chats')
      .delete()
      .eq('id', roomId);

    if (chatError) {
      console.error('Delete chat error:', chatError);
      return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
    }

    // Broadcast to other participants
    const channel = supabaseAdmin.channel(`chat:${roomId}`, { config: { broadcast: { self: false } } });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'chat_deleted',
          payload: { roomId }
        });
        channel.unsubscribe();
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete chat error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}