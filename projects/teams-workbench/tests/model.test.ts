import { test } from 'node:test'
import assert from 'node:assert/strict'
import { channels, groupTasks, mentionsWorkbench, people, tasks, threads, workbenchBot, workbenchResponse } from '../src/data.ts'
import { initialRoute, parseRoute, routeHash, taskRoute } from '../src/navigation.ts'

test('all generated tasks have valid unique identities, owners and same-channel threads', () => {
  assert.equal(new Set(tasks.map(task => task.id)).size, tasks.length)
  assert.equal(new Set(threads.map(thread => thread.id)).size, threads.length)
  assert.equal(tasks.length, threads.length)
  for (const task of tasks) {
    assert.ok(channels.some(channel => channel.id === task.channelId))
    assert.ok(people.some(person => person.id === task.ownerId))
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
  assert.deepEqual(grouped.map(group => group.label), ['Ready for you', 'Agent managed', 'Not started', 'Completed', 'Blocked'])
  assert.equal(grouped.flatMap(group => group.tasks).length, 6)
  assert.equal(grouped.find(group => group.status === 'Blocked')?.tasks.length, 0)
  assert.ok(groupTasks([]).every(group => group.tasks.length === 0))
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
