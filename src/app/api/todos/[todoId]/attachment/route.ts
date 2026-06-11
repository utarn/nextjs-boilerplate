import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStorageAdapter } from '@/lib/storage'
import { handleRouteError, NotFoundError } from '@/lib/route-guard'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ todoId: string }> }
) {
  try {
    const { todoId } = await params
    return await withAuth(request, async (user) => {
      const todo = await prisma.todo.findFirst({
        where: { id: todoId, userId: user.userId },
      })

      if (!todo) {
        throw new NotFoundError('Todo not found')
      }

      if (!todo.attachmentPath) {
        return NextResponse.json({ error: 'No attachment found' }, { status: 404 })
      }

      const storage = getStorageAdapter()
      const fileBuffer = await storage.download(todo.attachmentPath)

      const fileName = todo.attachmentName || 'attachment'

      // Infer content type from file extension
      const ext = fileName.split('.').pop()?.toLowerCase()
      const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        txt: 'text/plain',
        csv: 'text/csv',
        json: 'application/json',
        zip: 'application/zip',
        mp4: 'video/mp4',
        mp3: 'audio/mpeg',
      }
      const contentType = ext && mimeTypes[ext] ? mimeTypes[ext] : 'application/octet-stream'

      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
