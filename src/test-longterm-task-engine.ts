// Test: Long-term Task Engine
// Verifies create, start, pause, resume, checkpoint, cross-session recovery

import { longTermTaskEngine } from './modules/longterm/TaskEngine.js'
import { existsSync, readdirSync, rmSync } from 'fs'
import { resolve } from 'path'

const TASKS_DIR = resolve('.omc/tasks')

function cleanup(): void {
  if (existsSync(TASKS_DIR)) {
    rmSync(TASKS_DIR, { recursive: true, force: true })
  }
}

async function test(name: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn()
    console.log(`  PASS: ${name}`)
    return true
  } catch (e) {
    console.error(`  FAIL: ${name}`)
    console.error(`    ${e}`)
    return false
  }
}

async function main(): Promise<void> {
  console.log('\n=== Long-term Task Engine Tests ===\n')

  cleanup()
  await longTermTaskEngine.initialize()

  let passed = 0
  let total = 0

  // Test 1: Create task
  total++
  if (await test('Create task', async () => {
    const task = longTermTaskEngine.createTask({
      name: 'Test Task Alpha',
      description: 'A test task',
      priority: 'high',
      tags: ['test'],
    })
    if (!task.id) throw new Error('Task ID missing')
    if (task.state !== 'pending') throw new Error('Expected pending state')
    if (task.name !== 'Test Task Alpha') throw new Error('Name mismatch')
  })) passed++

  // Test 2: Start task
  total++
  if (await test('Start task', async () => {
    const tasks = longTermTaskEngine.queryTasks({ state: 'pending' })
    if (tasks.length === 0) throw new Error('No pending tasks')
    const task = await longTermTaskEngine.startTask(tasks[0].id)
    if (!task || task.state !== 'running') throw new Error('Failed to start')
  })) passed++

  // Test 3: Pause task
  total++
  if (await test('Pause running task', async () => {
    const tasks = longTermTaskEngine.queryTasks({ state: 'running' })
    if (tasks.length === 0) throw new Error('No running tasks')
    const task = await longTermTaskEngine.pauseTask(tasks[0].id, 'testing')
    if (!task || task.state !== 'paused') throw new Error('Failed to pause')
  })) passed++

  // Test 4: Resume task
  total++
  if (await test('Resume paused task', async () => {
    const tasks = longTermTaskEngine.queryTasks({ state: 'paused' })
    if (tasks.length === 0) throw new Error('No paused tasks')
    const task = await longTermTaskEngine.resumeTask(tasks[0].id)
    if (!task || task.state !== 'running') throw new Error('Failed to resume')
  })) passed++

  // Test 5: Create checkpoint
  total++
  if (await test('Create checkpoint', async () => {
    const tasks = longTermTaskEngine.queryTasks({ state: 'running' })
    if (tasks.length === 0) throw new Error('No running tasks')
    const cp = longTermTaskEngine.createCheckpoint(tasks[0].id, {
      progress: 0.5,
      currentFile: 'src/main.tsx',
    }, 'Halfway point')
    if (!cp) throw new Error('Checkpoint not created')
    if (!cp.canResume) throw new Error('Checkpoint should be resumable')
  })) passed++

  // Test 6: Task with steps
  total++
  if (await test('Task with steps', async () => {
    const task = longTermTaskEngine.createTask({
      name: 'Stepped Task',
      steps: [
        { name: 'Step 1: Setup' },
        { name: 'Step 2: Execute' },
        { name: 'Step 3: Verify' },
      ],
    })
    await longTermTaskEngine.startTask(task.id)
    if (task.steps[0].status !== 'running') throw new Error('Step 0 not running')

    longTermTaskEngine.advanceStep(task.id)
    if (task.steps[0].status !== 'completed') throw new Error('Step 0 not completed')
    if (task.steps[1].status !== 'running') throw new Error('Step 1 not started')

    longTermTaskEngine.advanceStep(task.id)
    longTermTaskEngine.advanceStep(task.id)
    // Should auto-complete after last step
  })) passed++

  // Test 7: Query and filter
  total++
  if (await test('Query tasks by tag', async () => {
    const results = longTermTaskEngine.queryTasks({ tags: ['test'] })
    if (results.length === 0) throw new Error('No tasks with test tag')
  })) passed++

  // Test 8: Stats
  total++
  if (await test('Get stats', async () => {
    const stats = longTermTaskEngine.getStats()
    if (stats.total === 0) throw new Error('No tasks counted')
    if (typeof stats.failureRate !== 'number') throw new Error('failureRate missing')
  })) passed++

  // Test 9: File persistence
  total++
  if (await test('Tasks persisted to disk', async () => {
    if (!existsSync(TASKS_DIR)) throw new Error('Tasks dir missing')
    const files = readdirSync(TASKS_DIR).filter(f => f.endsWith('.json'))
    if (files.length === 0) throw new Error('No task files on disk')
  })) passed++

  // Test 10: Cross-session recovery
  total++
  if (await test('Cross-session recovery', async () => {
    // Create a running task
    const task = longTermTaskEngine.createTask({ name: 'Recovery Test' })
    await longTermTaskEngine.startTask(task.id)
    const taskId = task.id

    // Simulate session end (shutdown saves paused state)
    await longTermTaskEngine.shutdown()

    // Re-initialize (simulates new session)
    const engine2 = longTermTaskEngine
    await engine2.initialize()

    const recovered = engine2.getTask(taskId)
    if (!recovered) throw new Error('Task not recovered after restart')
    // Running tasks should be auto-paused on recovery
    if (recovered.state !== 'paused') throw new Error(`Expected paused, got ${recovered.state}`)
  })) passed++

  // Test 11: Delete task
  total++
  if (await test('Delete task', async () => {
    const tasks = longTermTaskEngine.queryTasks({})
    if (tasks.length === 0) throw new Error('No tasks to delete')
    const ok = await longTermTaskEngine.deleteTask(tasks[0].id)
    if (!ok) throw new Error('Delete failed')
  })) passed++

  // Test 12: Recoverable tasks
  total++
  if (await test('Recoverable tasks', async () => {
    const recoverable = longTermTaskEngine.getRecoverableTasks()
    if (!Array.isArray(recoverable)) throw new Error('Should return array')
  })) passed++

  cleanup()
  console.log(`\n=== Results: ${passed}/${total} passed ===\n`)
}

main().catch(console.error)
