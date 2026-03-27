export const tasks: Record<string, { status: string; url: string | null; error: string | null; error_code: string | null; metadata: any }> = {};

export function processTask(taskId: string) {
  setTimeout(() => {
    tasks[taskId].status = 'completed';
  }, 5000);
}
