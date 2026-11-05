import { test } from 'node:test'
import assert from 'node:assert/strict'
import { channels, groupTasks, mentionsWorkbench, people, statuses, tasks, threads, workbenchBot, workbenchResponse } from '../src/data.ts'
import { initialRoute, parseRoute, routeHash, taskRoute } from '../src/navigation.ts'

test('all generated tasks have valid unique identities, owners and same-channel threads', () => {
  assert.equal(new Set(tasks.map(task => task.id)).size, tasks.length)
  assert.equal(new Set(threads.map(thread => thread.id)).size, threads.length)
  assert.equal(tasks.length, threads.length)
  for (const task of tasks) {
    assert.ok(channels.some(channel => channel.id === task.channelId))
    assert.ok(people.some(person => person.id === task.ownerId))
    assert.ok(statuses.includes(task.status))
    const thread = threads.find(item => item.id === task.threadId)
    assert.ok(thread)
    assert.equal(thread.channelId, task.channelId)
    assert.ok(thread.messages.length >= 2)
    for (const message of thread.messages) assert.ok([...people, workbenchBot].some(person => person.id === message.authorId))
    assert.ok(thread.messages.some(message => message.authorId !== workbenchBot.id && mentionsWorkbench(message.text)))
    assert.ok(thread.messages.some(message => message.authorId === workbenchBot.id))
  }
})

test('only standalone Workbench mentions trigger the bot and responses use current task state', () => {
  for (const text of ['@Workbench help', 'Hello @workbench!', '@WORKBENCH', 'Next step, @Workbench?']) assert.equal(mentionsWorkbench(text), true, text)
  for (const text of ['Ordinary reply', 'Workbench please help', '@WorkbenchExtra', '@Workbench-bot', 'person@workbench.com', '@anotherbot']) assert.equal(mentionsWorkbench(text), false, text)
  const updated = { ...tasks[0], status: 'Completed' as const, checklist: tasks[0].checklist.map(item => ({ ...item, done: true })) }
  assert.match(workbenchResponse(updated), /status is Completed/)
  assert.match(workbenchResponse(updated), /Review the completed checklist/)
  assert.match(workbenchResponse(updated), /No action was performed/)
})

test('grouping retains status order and explicitly represents empty groups', () => {
  const grouped = groupTasks(tasks.filter(task => task.channelId === 'launch'))
  assert.deepEqual(grouped.map(group => group.label), ['Ready for you', 'Not Started', 'In Progress', 'Completed'])
  assert.deepEqual(statuses, ['Not started', 'In progress', 'Ready for review', 'Completed'])
  assert.equal(grouped.flatMap(group => group.tasks).length, 18)
  assert.deepEqual(
    groupTasks(tasks).flatMap(group => group.tasks.map(task => task.id)).sort((a, b) => a - b),
    tasks.map(task => task.id).sort((a, b) => a - b),
  )
  assert.equal(tasks.find(task => task.id === 108)?.status, 'In progress')
  assert.ok(groupTasks([]).every(group => group.tasks.length === 0))
})

test('checklists mix short workflows with seven-stage delivery and thirteen completed tasks', () => {
  const stages = ['Investigate', 'Plan', 'Implement', 'Preview', 'Review', 'Merge', 'Deploy']
  for (const task of tasks) {
    const done = task.checklist.filter(item => item.done).length
    assert.ok(task.checklist.length > 0)
    assert.equal(new Set(task.checklist.map(item => item.text)).size, task.checklist.length)
    assert.deepEqual(task.checklist.map(item => item.done), task.checklist.map((_, index) => index < done))
    if (task.status === 'Completed') assert.equal(done, task.checklist.length)
    if (task.status === 'Not started') assert.equal(done, 0)
  }
  assert.deepEqual([...new Set(tasks.map(task => task.checklist.length))].sort(), [1, 2, 3, 4, 7])
  const deliveryTasks = tasks.filter(task => task.checklist.length === stages.length)
  assert.equal(deliveryTasks.length, 7)
  for (const task of deliveryTasks) assert.deepEqual(task.checklist.map(item => item.text), stages)
  assert.deepEqual([...new Set(deliveryTasks.map(task => task.checklist.filter(item => item.done).length))].sort(), [2, 5, 7])
  const completed = tasks.filter(task => task.status === 'Completed')
  assert.equal(completed.length, 13)
  assert.equal(completed.filter(task => task.id > 108).length, 12)
  assert.equal(new Set(completed.map(task => task.title)).size, completed.length)
  assert.equal(new Set(threads.map(thread => thread.messages[0].text)).size, threads.length)
  const checklistItems = tasks.flatMap(task => task.checklist)
  assert.equal(new Set(checklistItems).size, checklistItems.length)
})

test('design and brainstorming tasks stop at their own outcomes without software delivery steps', () => {
  const expectedSteps = new Map([
    [101, ['Investigate', 'Explore', 'Prototype', 'Review']],
    [105, ['Discuss', 'Capture ideas']],
    [107, ['Explore layouts', 'Compare concepts', 'Choose a direction']],
    [111, ['Explore', 'Design', 'Review']],
    [118, ['Brainstorm', 'Discuss', 'Summarize']],
  ])
  for (const [id, steps] of expectedSteps) {
    const task = tasks.find(candidate => candidate.id === id)
    assert.ok(task)
    assert.deepEqual(task.checklist.map(item => item.text), steps)
    assert.ok(task.checklist.every(item => !['Implement', 'Merge', 'Deploy'].includes(item.text)))
  }
  assert.deepEqual(tasks.filter(task => task.label === 'Brainstorming').map(task => task.status), ['Not started', 'Completed'])
  assert.match(workbenchResponse(tasks.find(task => task.id === 101)!), /Suggested next step: Prototype/)
  assert.match(workbenchResponse(tasks.find(task => task.id === 105)!), /Suggested next step: Discuss/)
})

test('each card route opens the matching channel, thread and task and round-trips', () => {
  for (const task of tasks) {
    const route = taskRoute(task.id)
    assert.equal(route.channelId, task.channelId)
    assert.equal(route.threadId, task.threadId)
    assert.equal(route.taskId, task.id)
    assert.equal(route.view, 'threads')
    assert.deepEqual(parseRoute(routeHash(route)), route)
  }
  assert.deepEqual(parseRoute(''), initialRoute)
  assert.equal(parseRoute(routeHash(initialRoute))?.view, 'board')
})

test('unknown or inconsistent routes are explicit errors, not success-shaped fallbacks', () => {
  for (const hash of [
    '#bad', '#/channels/missing/board', '#/channels/launch/files',
    '#/channels/launch/board/welcome-flow', '#/channels/launch/threads/missing',
    '#/channels/launch/threads/welcome-flow?task=103', '#/channels/launch/board?task=107',
    '#/channels/launch/board?task=999', '#/channels/launch/board?task=abc',
  ]) assert.equal(parseRoute(hash), null, hash)
  assert.throws(() => taskRoute(999), /Unknown mock task/)
})
