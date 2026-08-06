import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { checkPPTSubmissionTimelineStatus, savePPTLink } from '@/app/actions/drive';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Unauthorized session' }, { status: 401 });
    }

    try {
      await getAdminAuth().verifySessionCookie(sessionCookie, true);
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized session' }, { status: 401 });
    }

    const timelineStatus = await checkPPTSubmissionTimelineStatus();
    if (!timelineStatus.allowed) {
      return NextResponse.json({ success: false, error: timelineStatus.message }, { status: 403 });
    }

    const body = await request.json();
    const { teamId, fileName, mimeType, base64Data, oldFileId } = body;

    if (!teamId || !fileName || !base64Data) {
      return NextResponse.json({ success: false, error: 'Missing required upload parameters' }, { status: 400 });
    }

    const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      return NextResponse.json({ success: false, error: 'Google Apps Script URL is not configured' }, { status: 500 });
    }

    // Proxy request to Google Apps Script on server-side (no CORS issue, no terminal parameter logging)
    const googleRes = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        mimeType: mimeType || 'application/vnd.ms-powerpoint',
        base64Data,
        oldFileId: oldFileId || '',
      }),
    });

    if (!googleRes.ok) {
      const text = await googleRes.text();
      return NextResponse.json({ success: false, error: `Drive service error (${googleRes.status}): ${text}` }, { status: 502 });
    }

    const res = await googleRes.json();

    if (res.status === 'success' && res.url) {
      const saveRes = await savePPTLink(teamId, res.url, res.fileId);
      if (saveRes.success) {
        return NextResponse.json({ success: true, url: res.url, fileId: res.fileId });
      } else {
        return NextResponse.json({ success: false, error: saveRes.error || 'Failed to save PPT link in database' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ success: false, error: res.message || 'Failed to upload presentation to Drive' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in /api/upload-ppt route:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error during upload' }, { status: 500 });
  }
}
