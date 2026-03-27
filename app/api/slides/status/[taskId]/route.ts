import { NextResponse } from 'next/server';
import { tasks } from '../../store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const taskId = (await params).taskId;
  const task = tasks[taskId];

  if (!task) {
    return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    status: {
      task_id: taskId,
      status: task.status,
      url: task.url,
      error: task.error,
      error_code: task.error_code,
      metadata: task.metadata
    }
  });
}
