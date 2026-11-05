import { channels, tasks, threads } from './data.ts'

export type Route = { channelId: string; view: 'board' | 'threads'; threadId?: string; taskId?: number }
export const initialRoute: Route = { channelId: 'launch', view: 'board' }

export function routeHash(route: Route): string {
  const path = `#/channels/${route.channelId}/${route.view}${route.threadId ? `/${route.threadId}` : ''}`
  return `${path}${route.taskId ? `?task=${route.taskId}` : ''}`
}

export function parseRoute(hash: string): Route | null {
  if (!hash || hash === '#' || hash === '#/') return initialRoute
  const match = /^#\/channels\/([^/?]+)\/(board|threads)(?:\/([^/?]+))?(?:\?task=(\d+))?$/.exec(hash)
  if (!match) return null
  const [, channelId, view, threadId, taskValue] = match
  if (!channels.some(channel => channel.id === channelId)) return null
  if (view !== 'board' && view !== 'threads') return null
  if (threadId && (view !== 'threads' || !threads.some(thread => thread.id === threadId && thread.channelId === channelId))) return null
  const taskId = taskValue ? Number(taskValue) : undefined
  if (taskId !== undefined && !tasks.some(task => task.id === taskId && task.channelId === channelId && (!threadId || task.threadId === threadId))) return null
  return { channelId, view, threadId, taskId }
}

export function taskRoute(taskId: number): Route {
  const task = tasks.find(candidate => candidate.id === taskId)
  if (!task) throw new Error(`Unknown mock task: ${taskId}`)
  return { channelId: task.channelId, view: 'threads', threadId: task.threadId, taskId }
}
