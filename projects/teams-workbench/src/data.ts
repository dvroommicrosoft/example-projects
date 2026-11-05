export const statuses = ['Not started', 'In progress', 'Ready for review', 'Completed', 'Blocked'] as const
export type Status = typeof statuses[number]
export type Person = { id: string; name: string; initials: string; color: string; role: string }
export type Channel = { id: string; name: string; team: string; initials: string; color: string }
export type Message = { id: string; authorId: string; time: string; text: string }
export type Thread = { id: string; channelId: string; title: string; messages: Message[] }
export type Task = {
  id: number
  title: string
  description: string
  channelId: string
  threadId: string
  ownerId: string
  status: Status
  label: string
  checklist: { text: string; done: boolean }[]
}

export const people: Person[] = [
  { id: 'you', name: 'Alex Morgan', initials: 'AM', color: '#dce4ff', role: 'Product lead' },
  { id: 'maya', name: 'Maya Chen', initials: 'MC', color: '#e8dafa', role: 'Design' },
  { id: 'jordan', name: 'Jordan Lee', initials: 'JL', color: '#d2ece8', role: 'Engineering' },
  { id: 'sam', name: 'Sam Rivera', initials: 'SR', color: '#ffe5cc', role: 'Engineering' },
]

export const workbenchBot: Person = { id: 'workbench', name: 'Workbench', initials: 'WB', color: '#e8dafa', role: 'Bot' }

export const channels: Channel[] = [
  { id: 'launch', name: 'Product launch', team: 'Northstar Studio', initials: 'NS', color: '#e4defa' },
  { id: 'design', name: 'Design lab', team: 'Northstar Studio', initials: 'NS', color: '#e4defa' },
  { id: 'engineering', name: 'Engineering', team: 'Northstar Studio', initials: 'NS', color: '#e4defa' },
]

export const tasks: Task[] = [
  { id: 101, title: 'Shape the onboarding experience', description: 'Make the first five minutes feel effortless. Bring the welcome flow, team invitation, and first project together into one guided experience.', channelId: 'launch', threadId: 'welcome-flow', ownerId: 'maya', status: 'In progress', label: 'Experience', checklist: [{ text: 'Map the first-run journey', done: true }, { text: 'Explore welcome screen concepts', done: true }, { text: 'Review the interactive prototype', done: false }] },
  { id: 102, title: 'Build the launch checklist', description: 'Collect the final product, engineering, and communications milestones in a shared launch checklist.', channelId: 'launch', threadId: 'launch-checklist', ownerId: 'you', status: 'Not started', label: 'Planning', checklist: [{ text: 'Collect workstream milestones', done: false }, { text: 'Assign launch owners', done: false }] },
  { id: 103, title: 'Connect tasks to conversations', description: 'Keep decisions next to the work. Link each task to a Teams thread and open its details alongside the conversation.', channelId: 'launch', threadId: 'connected-work', ownerId: 'jordan', status: 'In progress', label: 'Integration', checklist: [{ text: 'Define task-to-thread relationships', done: true }, { text: 'Connect board navigation', done: false }, { text: 'Check the narrow-pane experience', done: false }] },
  { id: 104, title: 'Review the product story', description: 'Align the team on a concise story that explains how the new workspace helps people move from conversation to action.', channelId: 'launch', threadId: 'product-story', ownerId: 'sam', status: 'Ready for review', label: 'Content', checklist: [{ text: 'Draft the product narrative', done: true }, { text: 'Gather team feedback', done: false }] },
  { id: 105, title: 'Define our success signals', description: 'Agree on a small set of useful signals for the first release, with clear definitions and owners.', channelId: 'launch', threadId: 'success-signals', ownerId: 'you', status: 'Not started', label: 'Strategy', checklist: [{ text: 'Propose launch signals', done: false }, { text: 'Review with the team', done: false }] },
  { id: 106, title: 'Create the shared component library', description: 'Document the core building blocks and their accessible interaction states.', channelId: 'launch', threadId: 'component-library', ownerId: 'maya', status: 'Completed', label: 'Design system', checklist: [{ text: 'Define tokens', done: true }, { text: 'Document component states', done: true }] },
  { id: 107, title: 'Explore compact task cards', description: 'Find the right balance of context and density for task cards in smaller panes.', channelId: 'design', threadId: 'compact-cards', ownerId: 'maya', status: 'In progress', label: 'Exploration', checklist: [{ text: 'Compare compact layouts', done: false }] },
  { id: 108, title: 'Make thread links resilient', description: 'Preserve thread and task selection across refresh and browser navigation.', channelId: 'engineering', threadId: 'thread-routing', ownerId: 'jordan', status: 'Blocked', label: 'Routing', checklist: [{ text: 'Agree on route schema', done: true }, { text: 'Resolve routing review', done: false }] },
]

const conversations: Record<number, { opening: string; reply: string }> = {
  101: { opening: 'I put together a first pass at the welcome flow. The idea is to get people into a real project before we ask them to configure anything. What do you think?', reply: 'Love the direction. Let’s keep the invitation step optional so people can explore first. I’ve linked the task so we can track the next iteration here.' },
  102: { opening: 'Let’s give launch day a little less guesswork. I’m pulling together a shared checklist for all three workstreams.', reply: 'I can add the engineering milestones. We should include a clear owner for the go/no-go decision.' },
  103: { opening: 'What if the task board and our conversations felt like one workspace? Selecting a card could bring us straight to the right thread, with task details alongside.', reply: 'Exactly. The thread should be the conversation, not a duplicate discussion inside the task. This mock is a good way to try that interaction.' },
  104: { opening: 'The product story is ready for a fresh set of eyes. The theme is simple: less switching, more shared context.', reply: 'The opening is strong. Could we add a concrete example of a conversation turning into a task?' },
  105: { opening: 'Before we launch, let’s agree on what success looks like. I’d rather have three useful signals than a dashboard full of numbers.', reply: 'Time to first shared task feels like a good place to start. I’ll suggest a definition.' },
  106: { opening: 'The first set of shared components is ready: task cards, status labels, avatars, and detail panels.', reply: 'The keyboard and focus states look good. Marking this one complete. Nice work, team!' },
  107: { opening: 'Trying a compact card treatment for narrow panes. The groups will stack so we never squeeze the text into tiny columns.', reply: 'Let’s hide empty groups in that layout too. It will keep the view focused on the work.' },
  108: { opening: 'The route format is ready, but I’m waiting on the navigation review before we call it done.', reply: 'We should cover refresh, back/forward, and unknown thread links in the browser tests.' },
}

export const threads: Thread[] = tasks.map(task => ({
  id: task.threadId,
  channelId: task.channelId,
  title: task.title,
  messages: [
    { id: `${task.id}-1`, authorId: task.ownerId, time: '10:24 AM', text: conversations[task.id].opening },
    { id: `${task.id}-2`, authorId: task.ownerId === 'you' ? 'jordan' : 'you', time: '10:31 AM', text: conversations[task.id].reply },
    { id: `${task.id}-3`, authorId: task.ownerId, time: '10:32 AM', text: '@Workbench what is the next step for this task?' },
    { id: `${task.id}-4`, authorId: workbenchBot.id, time: '10:32 AM', text: workbenchResponse(task) },
  ],
}))

export function personById(id: string): Person {
  if (id === workbenchBot.id) return workbenchBot
  const person = people.find(candidate => candidate.id === id)
  if (!person) throw new Error(`Unknown mock person: ${id}`)
  return person
}

export function mentionsWorkbench(text: string): boolean {
  return /(^|\s)@workbench(?=$|[\s.,!?;:])/i.test(text)
}

export function workbenchResponse(task: Task): string {
  const next = task.checklist.find(item => !item.done)?.text ?? 'Review the completed checklist with the team'
  return `Simulated bot reply for #${task.id} "${task.title}": status is ${task.status}. Suggested next step: ${next}. Keep requests and decisions in this Teams thread; mention @Workbench to include me. No action was performed.`
}

export function groupTasks(items: Task[]) {
  const groups = [
    { status: 'Ready for review', label: 'Ready for you' },
    { status: 'In progress', label: 'Agent managed' },
    { status: 'Not started', label: 'Not started' },
    { status: 'Completed', label: 'Completed' },
    { status: 'Blocked', label: 'Blocked' },
  ] as const
  return groups.map(group => ({ ...group, tasks: items.filter(task => task.status === group.status) }))
}
