// Long-term Task Engine Command
// CLI interface for persistent task management

import type { Command } from '../../types/command.js'
import { longTermTaskEngine } from '../../modules/longterm/TaskEngine.js'
import type { TaskState, TaskPriority } from '../../modules/longterm/types.js'

const longtermCommand: Command = {
  type: 'local',
  name: 'longterm',
  aliases: ['lt', 'task'],
  description: 'Manage long-term persistent tasks',
  source: 'builtin',
  async call(args, _context) {
    // Ensure engine initialized
    await longTermTaskEngine.initialize()

    const trimmedArgs = args?.trim() || ''
    const parts = trimmedArgs.split(' ')
    const subcommand = parts[0]?.toLowerCase() || 'help'

    switch (subcommand) {
      case 'create': {
        const name = parts.slice(1).join(' ') || 'unnamed-task'
        const task = longTermTaskEngine.createTask({ name, priority: 'normal' })
        return {
          type: 'text',
          value: `Created task:\n  ID: ${task.id}\n  Name: ${task.name}\n  State: ${task.state}\n\nUse /longterm start ${task.id} to begin.`,
        }
      }

      case 'start': {
        const taskId = parts[1]
        if (!taskId) return { type: 'text', value: 'Usage: /longterm start <taskId>' }
        const task = await longTermTaskEngine.startTask(taskId)
        if (!task) return { type: 'text', value: `Task ${taskId} not found or cannot be started.` }
        return {
          type: 'text',
          value: `Started task: ${task.name}\n  State: ${task.state}\n  Steps: ${task.currentStepIndex + 1}/${task.steps.length}`,
        }
      }

      case 'pause': {
        const taskId = parts[1]
        if (!taskId) return { type: 'text', value: 'Usage: /longterm pause <taskId>' }
        const task = await longTermTaskEngine.pauseTask(taskId)
        if (!task) return { type: 'text', value: `Task ${taskId} not found or not running.` }
        return { type: 'text', value: `Paused task: ${task.name}` }
      }

      case 'resume': {
        const taskId = parts[1]
        if (!taskId) return { type: 'text', value: 'Usage: /longterm resume <taskId>' }
        const task = await longTermTaskEngine.resumeTask(taskId)
        if (!task) return { type: 'text', value: `Task ${taskId} not found or not paused.` }
        return { type: 'text', value: `Resumed task: ${task.name} (retry #${task.meta.retryCount})` }
      }

      case 'complete': {
        const taskId = parts[1]
        if (!taskId) return { type: 'text', value: 'Usage: /longterm complete <taskId>' }
        const task = await longTermTaskEngine.completeTask(taskId)
        if (!task) return { type: 'text', value: `Task ${taskId} not found or not running.` }
        return { type: 'text', value: `Completed task: ${task.name}` }
      }

      case 'cancel': {
        const taskId = parts[1]
        if (!taskId) return { type: 'text', value: 'Usage: /longterm cancel <taskId>' }
        const task = await longTermTaskEngine.cancelTask(taskId)
        if (!task) return { type: 'text', value: `Task ${taskId} not found.` }
        return { type: 'text', value: `Cancelled task: ${task.name}` }
      }

      case 'delete': {
        const taskId = parts[1]
        if (!taskId) return { type: 'text', value: 'Usage: /longterm delete <taskId>' }
        const ok = await longTermTaskEngine.deleteTask(taskId)
        return { type: 'text', value: ok ? `Deleted task: ${taskId}` : `Task ${taskId} not found.` }
      }

      case 'list': {
        const stateFilter = parts[1] as TaskState | undefined
        const query = stateFilter ? { state: stateFilter as TaskState } : {}
        const tasks = longTermTaskEngine.queryTasks(query)

        if (tasks.length === 0) {
          return { type: 'text', value: stateFilter ? `No tasks in state: ${stateFilter}` : 'No tasks.' }
        }

        const lines = tasks.slice(0, 20).map(t => {
          const icon = stateIcon(t.state)
          const stepInfo = t.steps.length > 0 ? ` [${t.currentStepIndex + 1}/${t.steps.length}]` : ''
          const timeAgo = timeAgoStr(t.updatedAt)
          return `${icon} ${t.id}  ${t.name}${stepInfo}  (${t.priority})  ${timeAgo}`
        })

        return {
          type: 'text',
          value: `Tasks (${tasks.length}):\n\n${lines.join('\n')}`,
        }
      }

      case 'status': {
        const taskId = parts[1]
        if (!taskId) {
          // Show overall stats
          const stats = longTermTaskEngine.getStats()
          return {
            type: 'text',
            value: `Task Engine Stats:
  Total tasks: ${stats.total}
  Active: ${stats.byState.running}
  Paused: ${stats.byState.paused}
  Completed: ${stats.byState.completed}
  Failed: ${stats.byState.failed}
  Pending: ${stats.byState.pending}
  Failure rate: ${(stats.failureRate * 100).toFixed(1)}%
  Avg completion: ${stats.avgCompletionTimeMs > 0 ? Math.round(stats.avgCompletionTimeMs / 1000) + 's' : 'N/A'}
  Oldest pending: ${stats.oldestPendingAge > 0 ? timeAgoStr(Date.now() - stats.oldestPendingAge) : 'N/A'}`,
          }
        }

        const task = longTermTaskEngine.getTask(taskId)
        if (!task) return { type: 'text', value: `Task ${taskId} not found.` }

        const checkpoints = longTermTaskEngine.getTaskCheckpoints(taskId)
        const stepsInfo = task.steps.length > 0
          ? task.steps.map((s, i) => `  ${i === task.currentStepIndex ? '→' : ' '} ${stepStatusIcon(s.status)} [${i}] ${s.name} (${s.status})`).join('\n')
          : '  No steps defined.'

        const cpInfo = checkpoints.length > 0
          ? `\n  Checkpoints (${checkpoints.length}):\n${checkpoints.slice(0, 5).map(cp => `  • ${cp.id} - ${timeAgoStr(cp.timestamp)}${cp.description ? ': ' + cp.description : ''}`).join('\n')}`
          : '\n  No checkpoints.'

        const stateHistory = task.stateHistory.slice(-5).map(h => `  ${h.from} → ${h.to} (${timeAgoStr(h.at)})${h.reason ? ' - ' + h.reason : ''}`).join('\n')

        return {
          type: 'text',
          value: `Task: ${task.name}
  ID: ${task.id}
  State: ${stateIcon(task.state)} ${task.state}
  Priority: ${task.priority}
  Created: ${timeAgoStr(task.createdAt)}
  Updated: ${timeAgoStr(task.updatedAt)}
  Tags: ${task.meta.tags.join(', ') || 'none'}
  Retries: ${task.meta.retryCount}/${task.meta.maxRetries}

Steps:
${stepsInfo}
${cpInfo}

State History (last 5):
${stateHistory}`,
        }
      }

      case 'recover': {
        const recoverable = longTermTaskEngine.getRecoverableTasks()
        if (recoverable.length === 0) {
          return { type: 'text', value: 'No tasks to recover. All tasks are in terminal states or already running.' }
        }
        const lines = recoverable.map(t =>
          `  ${t.id}  ${t.name}  (paused since ${timeAgoStr(t.pausedAt ?? t.updatedAt)})  retries: ${t.meta.retryCount}/${t.meta.maxRetries}`
        )
        return {
          type: 'text',
          value: `Recoverable tasks (${recoverable.length}):\n\n${lines.join('\n')}\n\nUse /longterm resume <taskId> to resume.`,
        }
      }

      case 'checkpoint': {
        const taskId = parts[1]
        if (!taskId) return { type: 'text', value: 'Usage: /longterm checkpoint <taskId>' }
        const task = longTermTaskEngine.getTask(taskId)
        if (!task) return { type: 'text', value: `Task ${taskId} not found.` }

        const cp = longTermTaskEngine.createCheckpoint(
          taskId,
          { ...task.context, __savedAt: Date.now() },
          `Manual checkpoint at ${new Date().toISOString()}`,
        )
        if (!cp) return { type: 'text', value: `Failed to create checkpoint.` }
        return { type: 'text', value: `Checkpoint created: ${cp.id}` }
      }

      case 'compact': {
        const count = longTermTaskEngine.compact()
        return { type: 'text', value: `Compacted: removed ${count} old tasks.` }
      }

      case 'help':
      default:
        return {
          type: 'text',
          value: `Long-term Task Engine - Persistent task management

Commands:
  /longterm create <name>        Create a new task
  /longterm start <id>           Start a task
  /longterm pause <id>           Pause a running task
  /longterm resume <id>          Resume a paused task
  /longterm complete <id>        Mark task as completed
  /longterm cancel <id>          Cancel a task
  /longterm delete <id>          Delete a task
  /longterm list [state]         List tasks (optionally filter by state)
  /longterm status [id]          Show task details or overall stats
  /longterm recover              Show tasks that can be recovered
  /longterm checkpoint <id>      Create a checkpoint
  /longterm compact              Clean up old completed tasks

States: pending → running → completed
                    ↘ paused → resume
                    ↘ failed
                    ↘ cancelled`,
        }
    }
  },
  isEnabled: () => true,
}

function stateIcon(state: string): string {
  const icons: Record<string, string> = {
    pending: '⏳',
    running: '🔄',
    paused: '⏸️',
    waiting: '⏳',
    completed: '✅',
    failed: '❌',
    cancelled: '⛔',
  }
  return icons[state] ?? '?'
}

function stepStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    pending: '○',
    running: '◐',
    completed: '●',
    failed: '✕',
    skipped: '-',
  }
  return icons[status] ?? '?'
}

function timeAgoStr(timestamp: number): string {
  const ms = Date.now() - timestamp
  if (ms < 60000) return 'just now'
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`
  return `${Math.floor(ms / 86400000)}d ago`
}

export default longtermCommand
