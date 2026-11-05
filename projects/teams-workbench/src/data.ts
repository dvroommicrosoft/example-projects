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
  checkInAfter?: string
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

function checklist(completed: number, stages = checklistStages): Task['checklist'] {
  return stages.map((text, index) => ({ text, done: index < completed }))
}

export const tasks: Task[] = [
  { id: 101, title: 'Shape the onboarding experience', description: 'Design-only exploration of the welcome flow, team invitation, and first project. Compare concepts and hand off a reviewed prototype; implementation is separate work.', channelId: 'launch', threadId: 'welcome-flow', ownerId: 'maya', status: 'In progress', label: 'Design', checklist: checklist(2, ['Investigate', 'Explore', 'Prototype', 'Review']) },
  { id: 102, title: 'Build the launch checklist', description: 'Collect the final product, engineering, and communications milestones in a shared launch checklist.', channelId: 'launch', threadId: 'launch-checklist', ownerId: 'you', status: 'Not started', label: 'Planning', checklist: [] },
  { id: 103, title: 'Connect tasks to conversations', description: 'Keep decisions next to the work. Link each task to a Teams thread and open its details alongside the conversation. A check-in is scheduled after Preview so the team can review the interaction before the remaining delivery steps.', channelId: 'launch', threadId: 'connected-work', ownerId: 'jordan', status: 'In progress', label: 'Integration', checklist: checklist(2), checkInAfter: 'Preview' },
  { id: 104, title: 'Review the product story', description: 'Align the team on a concise story that explains how the new workspace helps people move from conversation to action.', channelId: 'launch', threadId: 'product-story', ownerId: 'sam', status: 'Ready for review', label: 'Content', checklist: checklist(1, ['Draft', 'Review']) },
  { id: 105, title: 'Brainstorm our success signals', description: 'Discuss possible success signals for the first release and capture promising ideas. This brainstorming session does not include building dashboards or instrumentation.', channelId: 'launch', threadId: 'success-signals', ownerId: 'you', status: 'Not started', label: 'Brainstorming', checklist: [] },
  { id: 106, title: 'Create the shared component library', description: 'Document the core building blocks and their accessible interaction states.', channelId: 'launch', threadId: 'component-library', ownerId: 'maya', status: 'Completed', label: 'Design system', checklist: checklist(7) },
  { id: 107, title: 'Explore compact task cards', description: 'Compare design concepts for smaller panes and choose a direction. Deliver sketches and a recommendation, not an implementation.', channelId: 'design', threadId: 'compact-cards', ownerId: 'maya', status: 'In progress', label: 'Exploration', checklist: checklist(1, ['Explore layouts', 'Compare concepts', 'Choose a direction']) },
  { id: 108, title: 'Make thread links resilient', description: 'Preserve thread and task selection across refresh and browser navigation.', channelId: 'engineering', threadId: 'thread-routing', ownerId: 'jordan', status: 'In progress', label: 'Routing', checklist: checklist(5) },
  { id: 109, title: 'Publish the release notes', description: 'Explain the launch highlights, known limitations, and where the team can send feedback.', channelId: 'launch', threadId: 'release-notes', ownerId: 'sam', status: 'Completed', label: 'Content', checklist: checklist(3, ['Draft', 'Review', 'Publish']) },
  { id: 110, title: 'Add keyboard navigation to task cards', description: 'Make every task reachable by keyboard with clear focus and predictable activation.', channelId: 'launch', threadId: 'keyboard-navigation', ownerId: 'jordan', status: 'Completed', label: 'Accessibility', checklist: checklist(7) },
  { id: 111, title: 'Design the empty workspace state', description: 'Deliver reviewed mockups with concise guidance and a clear first action for new teams. This task ends at design handoff, before implementation.', channelId: 'launch', threadId: 'empty-workspace', ownerId: 'maya', status: 'Completed', label: 'Design', checklist: checklist(3, ['Explore', 'Design', 'Review']) },
  { id: 112, title: 'Document the support handoff', description: 'Give the support team a quick reference for common launch questions and escalation owners.', channelId: 'launch', threadId: 'support-handoff', ownerId: 'you', status: 'Completed', label: 'Operations', checklist: checklist(2, ['Draft', 'Share']) },
  { id: 113, title: 'Improve task search matching', description: 'Find tasks by title, owner, or label without case-sensitive surprises.', channelId: 'launch', threadId: 'search-matching', ownerId: 'jordan', status: 'Completed', label: 'Search', checklist: checklist(7) },
  { id: 114, title: 'Ship the mobile thread layout', description: 'Keep the selected conversation and task details readable on a phone-sized screen.', channelId: 'launch', threadId: 'mobile-thread-layout', ownerId: 'sam', status: 'Completed', label: 'Responsive', checklist: checklist(7) },
  { id: 115, title: 'Review dark theme contrast', description: 'Audit the proposed dark palette and document contrast findings for cards, controls, and thread messages. Share recommendations with the design team.', channelId: 'launch', threadId: 'dark-theme-contrast', ownerId: 'maya', status: 'Completed', label: 'Accessibility', checklist: checklist(3, ['Audit', 'Review', 'Document']) },
  { id: 116, title: 'Prepare the launch FAQ', description: 'Answer the most common questions about workspaces, task ownership, and team conversations.', channelId: 'launch', threadId: 'launch-faq', ownerId: 'you', status: 'Completed', label: 'Content', checklist: checklist(3, ['Draft', 'Review', 'Publish']) },
  { id: 117, title: 'Add clear invalid-link recovery', description: 'Explain when a workspace link is unavailable and offer a direct route back to the board.', channelId: 'launch', threadId: 'invalid-link-recovery', ownerId: 'jordan', status: 'Completed', label: 'Routing', checklist: checklist(7) },
  { id: 118, title: 'Brainstorm clearer task labels', description: 'Explore alternatives to overlapping workstream labels, discuss the tradeoffs, and summarize ideas for a later decision. No implementation is included.', channelId: 'launch', threadId: 'task-labels', ownerId: 'you', status: 'Completed', label: 'Brainstorming', checklist: checklist(3, ['Brainstorm', 'Discuss', 'Summarize']) },
  { id: 119, title: 'Review notification copy', description: 'Review proposed reminder wording for clarity about the task, requested input, and next step. Leave consolidated editorial feedback.', channelId: 'launch', threadId: 'notification-copy', ownerId: 'sam', status: 'Completed', label: 'Content', checklist: checklist(1, ['Review']) },
  { id: 120, title: 'Document the team working agreement', description: 'Discuss how the team assigns work, requests reviews, and records decisions, then capture the agreement in a shared document.', channelId: 'launch', threadId: 'working-agreement', ownerId: 'you', status: 'Completed', label: 'Operations', checklist: checklist(2, ['Discuss', 'Document']) },
]

const conversations: Record<number, { opening: string; reply: string }> = {
  101: { opening: 'I put together a first pass at the welcome flow. The idea is to get people into a real project before we ask them to configure anything. What do you think?', reply: 'Love the direction. Let’s keep the invitation step optional so people can explore first. I’ve linked the task so we can track the next iteration here.' },
  102: { opening: 'Let’s give launch day a little less guesswork. I’m pulling together a shared checklist for all three workstreams.', reply: 'I can add the engineering milestones. We should include a clear owner for the go/no-go decision.' },
  103: { opening: 'What if the task board and our conversations felt like one workspace? Selecting a card could bring us straight to the right thread, with task details alongside.', reply: 'Exactly. A check-in is scheduled after Preview so we can review the interaction together before continuing with review, merge, and deployment.' },
  104: { opening: 'The product story is ready for a fresh set of eyes. The theme is simple: less switching, more shared context.', reply: 'The opening is strong. Could we add a concrete example of a conversation turning into a task?' },
  105: { opening: 'Before we launch, let’s agree on what success looks like. I’d rather have three useful signals than a dashboard full of numbers.', reply: 'Time to first shared task feels like a good place to start. I’ll suggest a definition.' },
  106: { opening: 'The first set of shared components is ready: task cards, status labels, avatars, and detail panels.', reply: 'The keyboard and focus states look good. Marking this one complete. Nice work, team!' },
  107: { opening: 'Trying a few compact card sketches for narrow panes. This task is about comparing design directions, not building the chosen layout yet.', reply: 'Let’s compare a stacked layout with a denser card concept, then record our recommendation for implementation.' },
  108: { opening: 'The route format and navigation review are complete. I’m preparing the final integration before deployment.', reply: 'The refresh, back/forward, and unknown thread checks look good. Let’s keep the final rollout notes here.' },
  109: { opening: 'The release notes now cover the new board, linked threads, and the limitations of this first release.', reply: 'Published with the launch guide. The feedback link is easy to find, and the team has the final copy.' },
  110: { opening: 'Task cards now have a clear keyboard focus ring and open with Enter, just like their pointer action.', reply: 'The keyboard walkthrough is complete, including returning to the board. This is shipped.' },
  111: { opening: 'The empty workspace mockups now explain what to do next without overwhelming a new team.', reply: 'The design review is complete and the handoff is ready. Building the chosen layout will be a separate task.' },
  112: { opening: 'The support handoff includes common questions, troubleshooting steps, and a named escalation owner.', reply: 'Support has reviewed the guide and the published version is linked from our launch notes.' },
  113: { opening: 'Search now matches task titles, owners, and labels consistently, regardless of capitalization.', reply: 'Checked the search examples and clear-filter recovery. The update is deployed.' },
  114: { opening: 'The phone layout keeps the active thread above the task details instead of squeezing both side by side.', reply: 'The small-screen walkthrough is complete, including replies and closing details. Shipped with the launch build.' },
  115: { opening: 'The dark theme audit covers proposed colors for card titles, secondary text, controls, and bot messages.', reply: 'The contrast findings and palette recommendations are documented. The design team has the review notes.' },
  116: { opening: 'The launch FAQ now answers the questions from our rehearsal, including task ownership and where decisions belong.', reply: 'The team reviewed the answers and the FAQ is published beside the release notes.' },
  117: { opening: 'Unknown workspace links now explain the problem and provide a clear return-to-board action.', reply: 'Checked missing channels, threads, and task IDs. The recovery path is in the deployed build.' },
  118: { opening: 'We brainstormed a few ways to simplify task labels, including grouping by workstream or by the kind of input needed.', reply: 'The discussion and tradeoffs are summarized. We can choose which ideas to pursue later; no label changes are part of this task.' },
  119: { opening: 'The proposed review reminders name the task and describe the input needed instead of saying only that something changed.', reply: 'Editorial review is complete. I left consolidated feedback for the copy owner; publishing is outside this review task.' },
  120: { opening: 'The working agreement describes ownership, review expectations, and keeping decisions in the linked Teams thread.', reply: 'Our discussion is captured in the shared document. This task needed an agreement, not a software delivery pipeline.' },
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
  const next = task.status === 'Not started' || task.checklist.length === 0
    ? 'Discuss the task and plan the work'
    : task.checklist.find(item => !item.done)?.text ?? 'Review the completed checklist with the team'
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
