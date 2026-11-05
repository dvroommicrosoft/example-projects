export const statuses = ['Not started', 'In progress', 'Ready for review', 'Completed'] as const
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

const checklistStages = ['Investigate', 'Plan', 'Implement', 'Preview', 'Review', 'Merge', 'Deploy']

function checklist(completed: number): Task['checklist'] {
  return checklistStages.map((text, index) => ({ text, done: index < completed }))
}

export const tasks: Task[] = [
  { id: 101, title: 'Shape the onboarding experience', description: 'Make the first five minutes feel effortless. Bring the welcome flow, team invitation, and first project together into one guided experience.', channelId: 'launch', threadId: 'welcome-flow', ownerId: 'maya', status: 'In progress', label: 'Experience', checklist: checklist(3) },
  { id: 102, title: 'Build the launch checklist', description: 'Collect the final product, engineering, and communications milestones in a shared launch checklist.', channelId: 'launch', threadId: 'launch-checklist', ownerId: 'you', status: 'Not started', label: 'Planning', checklist: checklist(0) },
  { id: 103, title: 'Connect tasks to conversations', description: 'Keep decisions next to the work. Link each task to a Teams thread and open its details alongside the conversation.', channelId: 'launch', threadId: 'connected-work', ownerId: 'jordan', status: 'In progress', label: 'Integration', checklist: checklist(2) },
  { id: 104, title: 'Review the product story', description: 'Align the team on a concise story that explains how the new workspace helps people move from conversation to action.', channelId: 'launch', threadId: 'product-story', ownerId: 'sam', status: 'Ready for review', label: 'Content', checklist: checklist(4) },
  { id: 105, title: 'Define our success signals', description: 'Agree on a small set of useful signals for the first release, with clear definitions and owners.', channelId: 'launch', threadId: 'success-signals', ownerId: 'you', status: 'Not started', label: 'Strategy', checklist: checklist(0) },
  { id: 106, title: 'Create the shared component library', description: 'Document the core building blocks and their accessible interaction states.', channelId: 'launch', threadId: 'component-library', ownerId: 'maya', status: 'Completed', label: 'Design system', checklist: checklist(7) },
  { id: 107, title: 'Explore compact task cards', description: 'Find the right balance of context and density for task cards in smaller panes.', channelId: 'design', threadId: 'compact-cards', ownerId: 'maya', status: 'In progress', label: 'Exploration', checklist: checklist(1) },
  { id: 108, title: 'Make thread links resilient', description: 'Preserve thread and task selection across refresh and browser navigation.', channelId: 'engineering', threadId: 'thread-routing', ownerId: 'jordan', status: 'In progress', label: 'Routing', checklist: checklist(5) },
  { id: 109, title: 'Publish the release notes', description: 'Explain the launch highlights, known limitations, and where the team can send feedback.', channelId: 'launch', threadId: 'release-notes', ownerId: 'sam', status: 'Completed', label: 'Content', checklist: checklist(7) },
  { id: 110, title: 'Add keyboard navigation to task cards', description: 'Make every task reachable by keyboard with clear focus and predictable activation.', channelId: 'launch', threadId: 'keyboard-navigation', ownerId: 'jordan', status: 'Completed', label: 'Accessibility', checklist: checklist(7) },
  { id: 111, title: 'Polish the empty workspace state', description: 'Give new teams a useful starting point with concise guidance and a clear first action.', channelId: 'launch', threadId: 'empty-workspace', ownerId: 'maya', status: 'Completed', label: 'Experience', checklist: checklist(7) },
  { id: 112, title: 'Document the support handoff', description: 'Give the support team a quick reference for common launch questions and escalation owners.', channelId: 'launch', threadId: 'support-handoff', ownerId: 'you', status: 'Completed', label: 'Operations', checklist: checklist(7) },
  { id: 113, title: 'Improve task search matching', description: 'Find tasks by title, owner, or label without case-sensitive surprises.', channelId: 'launch', threadId: 'search-matching', ownerId: 'jordan', status: 'Completed', label: 'Search', checklist: checklist(7) },
  { id: 114, title: 'Ship the mobile thread layout', description: 'Keep the selected conversation and task details readable on a phone-sized screen.', channelId: 'launch', threadId: 'mobile-thread-layout', ownerId: 'sam', status: 'Completed', label: 'Responsive', checklist: checklist(7) },
  { id: 115, title: 'Review dark theme contrast', description: 'Adjust text and surface colors so cards, controls, and thread messages stay readable in dark mode.', channelId: 'launch', threadId: 'dark-theme-contrast', ownerId: 'maya', status: 'Completed', label: 'Accessibility', checklist: checklist(7) },
  { id: 116, title: 'Prepare the launch FAQ', description: 'Answer the most common questions about workspaces, task ownership, and team conversations.', channelId: 'launch', threadId: 'launch-faq', ownerId: 'you', status: 'Completed', label: 'Content', checklist: checklist(7) },
  { id: 117, title: 'Add clear invalid-link recovery', description: 'Explain when a workspace link is unavailable and offer a direct route back to the board.', channelId: 'launch', threadId: 'invalid-link-recovery', ownerId: 'jordan', status: 'Completed', label: 'Routing', checklist: checklist(7) },
  { id: 118, title: 'Standardize task labels', description: 'Replace overlapping workstream labels with a small, consistent set that the team can scan quickly.', channelId: 'launch', threadId: 'task-labels', ownerId: 'you', status: 'Completed', label: 'Planning', checklist: checklist(7) },
  { id: 119, title: 'Refine notification copy', description: 'Make review reminders specific about the task, requested input, and next step.', channelId: 'launch', threadId: 'notification-copy', ownerId: 'sam', status: 'Completed', label: 'Content', checklist: checklist(7) },
  { id: 120, title: 'Publish the team working agreement', description: 'Document how the team assigns work, requests reviews, and records decisions in task threads.', channelId: 'launch', threadId: 'working-agreement', ownerId: 'you', status: 'Completed', label: 'Operations', checklist: checklist(7) },
]

const conversations: Record<number, { opening: string; reply: string }> = {
  101: { opening: 'I put together a first pass at the welcome flow. The idea is to get people into a real project before we ask them to configure anything. What do you think?', reply: 'Love the direction. Let’s keep the invitation step optional so people can explore first. I’ve linked the task so we can track the next iteration here.' },
  102: { opening: 'Let’s give launch day a little less guesswork. I’m pulling together a shared checklist for all three workstreams.', reply: 'I can add the engineering milestones. We should include a clear owner for the go/no-go decision.' },
  103: { opening: 'What if the task board and our conversations felt like one workspace? Selecting a card could bring us straight to the right thread, with task details alongside.', reply: 'Exactly. The thread should be the conversation, not a duplicate discussion inside the task. This mock is a good way to try that interaction.' },
  104: { opening: 'The product story is ready for a fresh set of eyes. The theme is simple: less switching, more shared context.', reply: 'The opening is strong. Could we add a concrete example of a conversation turning into a task?' },
  105: { opening: 'Before we launch, let’s agree on what success looks like. I’d rather have three useful signals than a dashboard full of numbers.', reply: 'Time to first shared task feels like a good place to start. I’ll suggest a definition.' },
  106: { opening: 'The first set of shared components is ready: task cards, status labels, avatars, and detail panels.', reply: 'The keyboard and focus states look good. Marking this one complete. Nice work, team!' },
  107: { opening: 'Trying a compact card treatment for narrow panes. The groups will stack so we never squeeze the text into tiny columns.', reply: 'Let’s hide empty groups in that layout too. It will keep the view focused on the work.' },
  108: { opening: 'The route format and navigation review are complete. I’m preparing the final integration before deployment.', reply: 'The refresh, back/forward, and unknown thread checks look good. Let’s keep the final rollout notes here.' },
  109: { opening: 'The release notes now cover the new board, linked threads, and the limitations of this first release.', reply: 'Published with the launch guide. The feedback link is easy to find, and the team has the final copy.' },
  110: { opening: 'Task cards now have a clear keyboard focus ring and open with Enter, just like their pointer action.', reply: 'The keyboard walkthrough is complete, including returning to the board. This is shipped.' },
  111: { opening: 'The empty workspace now explains what to do next without overwhelming a new team.', reply: 'The copy and first-action layout are in the release. Much easier to understand on a fresh workspace.' },
  112: { opening: 'The support handoff includes common questions, troubleshooting steps, and a named escalation owner.', reply: 'Support has reviewed the guide and the published version is linked from our launch notes.' },
  113: { opening: 'Search now matches task titles, owners, and labels consistently, regardless of capitalization.', reply: 'Checked the search examples and clear-filter recovery. The update is deployed.' },
  114: { opening: 'The phone layout keeps the active thread above the task details instead of squeezing both side by side.', reply: 'The small-screen walkthrough is complete, including replies and closing details. Shipped with the launch build.' },
  115: { opening: 'The dark theme contrast pass covers card titles, secondary text, controls, and bot messages.', reply: 'The updated palette is published. Both initial dark mode and live OS theme switching are covered.' },
  116: { opening: 'The launch FAQ now answers the questions from our rehearsal, including task ownership and where decisions belong.', reply: 'The team reviewed the answers and the FAQ is published beside the release notes.' },
  117: { opening: 'Unknown workspace links now explain the problem and provide a clear return-to-board action.', reply: 'Checked missing channels, threads, and task IDs. The recovery path is in the deployed build.' },
  118: { opening: 'I consolidated the workstream labels and documented when each one should be used.', reply: 'The updated labels and reference guide are published. The board is much easier to scan now.' },
  119: { opening: 'Review reminders now name the task and describe the input needed instead of saying only that something changed.', reply: 'The final wording is approved and published with the launch copy. No follow-up edits remain.' },
  120: { opening: 'The working agreement describes ownership, review expectations, and keeping decisions in the linked Teams thread.', reply: 'Everyone has reviewed it, and the published guide is linked from the channel welcome message.' },
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
    { status: 'Not started', label: 'Not Started' },
    { status: 'In progress', label: 'In Progress' },
    { status: 'Completed', label: 'Completed' },
  ] as const
  return groups.map(group => ({ ...group, tasks: items.filter(task => task.status === group.status) }))
}
