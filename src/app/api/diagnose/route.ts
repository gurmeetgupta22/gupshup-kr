import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const logFilePath = path.join(process.cwd(), 'client-diagnostics.log');
    const logLine = `[${new Date().toISOString()}] ${JSON.stringify(body)}\n`;
    fs.appendFileSync(logFilePath, logLine, 'utf8');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
