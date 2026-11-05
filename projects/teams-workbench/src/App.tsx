import { Fragment, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, AtSign, Bell, Bot, CalendarDays, Check,
  ChevronDown, ChevronLeft, ChevronRight, Circle, CircleCheck, CircleDashed, Cloud,
  Columns3, GitFork, Globe, Hash, Inbox, LayoutGrid, ListFilter,
  LoaderCircle, MessageSquare, MessageSquareText, MoreHorizontal, PanelLeft,
  Pause, Phone, Plus, Search, Send, Settings2, Smile, Sparkles, SquarePen, Users, X,
} from 'lucide-react'
import { channels, groupTasks, mentionsWorkbench, people, personById, statuses, tasks as seedTasks, threads as seedThreads, workbenchBot, workbenchResponse } from './data'
import type { Message, Person, Status, Task } from './data'
import { initialRoute, parseRoute, routeHash, taskRoute } from './navigation'
import type { Route } from './navigation'
import './App.css'
import './theme.css'

function Avatar({ person, small = false, presence = false }: { person: Person; small?: boolean; presence?: boolean }) {
  return <span className={`avatar ${small ? 'avatar-small' : ''}`} style={{ background: person.color }} title={person.name}>
    {person.id === workbenchBot.id ? <Bot size={17} /> : person.initials}{presence && person.id !== workbenchBot.id && <span className="avatar-presence"><Check size={8} /></span>}
  </span>
}

function StatusIcon({ status }: { status: Status }) {
  if (status === 'Ready for review') return <Inbox size={15} />
  if (status === 'Completed') return <CircleCheck size={15} />
  if (status === 'Not started') return <CircleDashed size={15} />
  return <Circle size={15} />
}

function TaskPill({ task }: { task: Task }) {
  if (task.status === 'Ready for review') return <span className="task-pill attention"><Globe size={13} />Preview</span>
  if (task.status === 'In progress') return <span className="task-pill"><LoaderCircle size={13} />Running</span>
  return null
}

function ChecklistTrack({ task }: { task: Task }) {
  if (task.status === 'Not started' || task.checklist.length === 0) return null
  const complete = task.checklist.filter(item => item.done).length
  const checkInAfter = task.status === 'In progress' ? task.checkInAfter : undefined
  return <div className="checklist-track" style={{ width: `${Math.min(task.checklist.length, 5) * 20}%` }} role="img" aria-label={`Checklist: ${complete} of ${task.checklist.length} complete${checkInAfter ? `; Check-in after ${checkInAfter}` : ''}`}>
    {task.checklist.map((item, index) => <span className={`track-segment ${item.done ? 'done' : ''}`} key={item.text} title={`${item.text}: ${item.done ? 'complete' : 'pending'}`}>
      {index < task.checklist.length - 1 && <span className="segment-tick" />}
      {checkInAfter === item.text && <span className="track-check-in scheduled" title={`Check-in after ${item.text}`}><Pause size={10} /></span>}
    </span>)}
    {task.status === 'Ready for review' ? <span className="track-check-in"><Pause size={10} /></span> : <span className={`track-end ${complete === task.checklist.length ? 'done' : ''}`} />}
  </div>
}

function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  const [tasks, setTasks] = useState(seedTasks)
  const [threads, setThreads] = useState(seedThreads)
  const [search, setSearch] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [showNav, setShowNav] = useState(false)
  const [reply, setReply] = useState('')
  const threadHeading = useRef<HTMLHeadingElement>(null)
  const replyInput = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const update = () => { setRoute(parseRoute(window.location.hash)); setReply('') }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  const selectedThreadId = route?.threadId
  useEffect(() => { if (selectedThreadId) threadHeading.current?.focus() }, [selectedThreadId])

  function navigate(next: Route) {
    window.location.hash = routeHash(next)
    setShowNav(false)
  }

  if (!route) {
    return <main className="not-found"><MessageSquare size={36} /><h1>This workspace link isn't available</h1><p>The channel, task, or thread may not exist in this mock.</p><a href={routeHash(initialRoute)}>Return to the Workbench board</a></main>
  }

  const channel = channels.find(item => item.id === route.channelId)!
  const selectedTask = tasks.find(task => task.id === route.taskId)
  const selectedThread = threads.find(thread => thread.id === route.threadId)
  const channelThreads = threads.filter(thread => thread.channelId === channel.id)
  const visibleTasks = tasks.filter(task => task.channelId === channel.id && (!mineOnly || task.ownerId === 'you') && `${task.title} ${task.label} ${personById(task.ownerId).name}`.toLowerCase().includes(search.toLowerCase()))

  function changeTask(next: Task) {
    setTasks(current => current.map(task => task.id === next.id ? next : task))
  }

  function sendReply(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedThread || !reply.trim()) return
    const message: Message = { id: crypto.randomUUID(), authorId: 'you', time: 'Just now', text: reply.trim() }
    const task = tasks.find(item => item.threadId === selectedThread.id)!
    const additions: Message[] = [message]
    if (mentionsWorkbench(message.text)) additions.push({ id: crypto.randomUUID(), authorId: workbenchBot.id, time: 'Just now', text: workbenchResponse(task) })
    setThreads(current => current.map(thread => thread.id === selectedThread.id ? { ...thread, messages: [...thread.messages, ...additions] } : thread))
    setReply('')
  }

  return <div className="teams-shell">
    <button className="skip-link" onClick={() => document.getElementById('workspace')?.focus()}>Skip to workspace</button>
    <header className="teams-topbar">
      <div className="teams-brand"><span className="teams-monogram">T</span><span>Microsoft Teams</span></div>
      <div className="history-buttons"><button className="icon-button" aria-label="Go back" onClick={() => window.history.back()}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="Go forward" onClick={() => window.history.forward()}><ChevronRight size={18} /></button></div>
      <form className="topbar-search" onSubmit={event => { event.preventDefault(); navigate({ channelId: channel.id, view: 'board' }) }}><Search size={16} /><input aria-label="Search this workspace" placeholder="Search" value={search} onChange={event => setSearch(event.target.value)} /><span>Ctrl+Alt+E</span></form>
      <div className="topbar-right"><span className="demo-badge">Mock workspace</span><MoreHorizontal size={20} /><Avatar person={people[0]} presence /></div>
    </header>
    <div className="app-layout">
      <nav className="app-rail" aria-label="Teams apps">
        <div className="rail-item shell-decoration"><Bell size={23} /><span>Activity</span></div>
        <button className="rail-item active" onClick={() => navigate({ channelId: channel.id, view: 'threads' })}><MessageSquareText size={23} /><span>Chat</span></button>
        <div className="rail-item shell-decoration"><CalendarDays size={23} /><span>Calendar</span></div>
        <div className="rail-item shell-decoration"><Phone size={23} /><span>Calls</span></div>
        <div className="rail-item shell-decoration"><Cloud size={23} /><span>OneDrive</span></div>
        <button className="rail-item" onClick={() => navigate({ channelId: channel.id, view: 'board', taskId: selectedTask?.id })}><Columns3 size={23} /><span>Workbench</span></button>
        <div className="rail-item rail-more shell-decoration"><MoreHorizontal size={23} /></div>
        <div className="rail-item shell-decoration"><Plus size={23} /><span>Apps</span></div>
      </nav>
      <aside className={`channel-sidebar ${showNav ? 'nav-open' : ''}`} aria-label="Teams and channels">
        <div className="sidebar-heading"><h2>Chat</h2><div className="sidebar-heading-tools"><MoreHorizontal size={18} /><Search size={17} /><SquarePen size={18} /><ChevronDown size={14} /></div><button className="icon-button mobile-nav-close" aria-label="Close channel navigation" onClick={() => setShowNav(false)}><X size={18} /></button></div>
        <div className="sidebar-pills"><span>Unread</span><span>Chats</span><span className="selected">Channels</span><ChevronDown size={15} /></div>
        <div className="quick-views">
          <div className="shell-decoration"><Sparkles size={18} /><span>Copilot</span></div>
          <div className="shell-decoration"><LayoutGrid size={18} /><span>Discover</span></div>
          <div className="shell-decoration"><AtSign size={18} /><strong>Mentions</strong><span className="quick-count">2</span></div>
          <button onClick={() => navigate({ channelId: channel.id, view: 'threads' })}><MessageSquareText size={18} /><strong>Followed threads</strong><span className="quick-count">6</span></button>
        </div>
        <div className="sidebar-section-label"><ChevronDown size={12} />Favorites</div>
        <button className="favorite-link" onClick={() => navigate(initialRoute)}><span className="team-avatar small-team">NS</span><span>Product launch</span><span className="sidebar-at">@</span></button>
        <div className="sidebar-section-label"><ChevronDown size={12} />Chats</div>
        <div className="chat-people">{people.slice(1).map(person => <div key={person.id} className="shell-decoration"><Avatar person={person} small presence /><span>{person.name}</span></div>)}</div>
        <div className="sidebar-section-label"><ChevronDown size={12} />Teams and channels</div>
        <div className="team-name"><ChevronDown size={14} /><span className="team-avatar">NS</span><strong>Northstar Studio</strong><MoreHorizontal size={17} /></div>
        <div className="channel-links">{channels.map(item => <button key={item.id} className={channel.id === item.id ? 'selected' : ''} onClick={() => navigate({ channelId: item.id, view: route.view })}><Hash size={16} /><span>{item.name}</span>{item.id === 'launch' && <span className="unread-dot" />}</button>)}</div>
        <div className="sidebar-footer"><Users size={16} /><span>Fictional team · local demo</span></div>
      </aside>
      <main className="workspace" id="workspace" tabIndex={-1}>
        <header className="channel-header">
          <button className="icon-button channel-menu" aria-label="Open channel navigation" onClick={() => setShowNav(!showNav)}><PanelLeft size={20} /></button>
          <span className="channel-avatar">NS</span>
          <h1>{channel.name}</h1>
          <nav className="channel-tabs" aria-label="Channel tabs">
            <button className={route.view === 'threads' ? 'selected' : ''} onClick={() => navigate({ channelId: channel.id, view: 'threads', threadId: route.threadId, taskId: route.taskId })}>Conversation</button>
            <span className="shell-decoration shared-tab">Shared</span>
            <button className={route.view === 'board' ? 'selected' : ''} onClick={() => navigate({ channelId: channel.id, view: 'board', taskId: route.taskId })}><Columns3 size={16} />Workbench</button>
          </nav>
          <div className="channel-header-tools"><Users size={18} /><span>5</span><Search size={18} /><MoreHorizontal size={21} /></div>
        </header>
        <div className={`workspace-body ${selectedThread ? 'has-thread' : ''} ${selectedTask ? 'has-task' : ''}`}>
          <section className="primary-pane" aria-label={route.view === 'board' ? 'Workbench board' : 'Teams conversations'}>
            {route.view === 'board' ? <>
              <div className="workbench-querybar"><div><Search size={17} /><strong>All tasks</strong><span>in {channel.name}</span></div><span className="mock-label">ADX · mock data</span></div>
              <div className="board-toolbar">
                <div className="board-view-label"><Columns3 size={16} /><strong>Board</strong><ChevronDown size={13} /><span>{visibleTasks.length} tasks</span></div>
                <div className="board-filters"><label className="task-search"><Search size={15} /><input aria-label="Find a task" placeholder="Filter tasks" value={search} onChange={event => setSearch(event.target.value)} /></label><button className={`filter-button ${mineOnly ? 'selected' : ''}`} aria-pressed={mineOnly} onClick={() => setMineOnly(!mineOnly)}><ListFilter size={15} /><span>Assigned to me</span></button><span className="grouping-label"><Settings2 size={14} />Status</span></div>
              </div>
              <div className="board-workspace" data-testid="board-container">
                {visibleTasks.length === 0 && <div className="empty-board" role="status"><Search size={25} /><h3>No matching tasks</h3><p>Try a different search or show everyone's work.</p><button className="text-button" onClick={() => { setSearch(''); setMineOnly(false) }}>Clear filters</button></div>}
                <div className={`board-columns ${visibleTasks.length === 0 ? 'all-empty' : ''}`}>{groupTasks(visibleTasks).map(group => <section key={group.status} className={`task-group ${group.status === 'Ready for review' ? 'ready-group' : ''} ${group.tasks.length === 0 ? 'empty-group' : ''}`} aria-label={`${group.label} tasks`} data-status={group.status}>
                  <div className="group-heading"><StatusIcon status={group.status} /><h3>{group.label}</h3><span className="group-count">{group.tasks.length}</span></div>
                  <div className="group-cards">{group.tasks.map(task => <TaskCard key={task.id} task={task} selected={task.id === route.taskId} onOpen={() => navigate(taskRoute(task.id))} />)}{group.tasks.length === 0 && <div className="empty-group-note">No tasks</div>}</div>
                </section>)}</div>
              </div>
              <div className="board-footer"><span>{visibleTasks.length} tasks</span><span>Card opens Teams thread + task details</span><span>All changes reset on refresh</span></div>
            </> : <div className="channel-feed">
              <div className="feed-date"><span />Today<span /></div>
              {channelThreads.map(thread => <article key={thread.id} className={`channel-post ${thread.id === selectedThread?.id ? 'post-selected' : ''}`}>
                <Avatar person={personById(thread.messages[0].authorId)} presence />
                <div className="channel-post-body"><div className="message-meta"><strong>{personById(thread.messages[0].authorId).name}</strong><span>{thread.messages[0].time}</span></div>
                  <div className="channel-bubble"><strong>{thread.title}</strong><p>{thread.messages[0].text}</p></div>
                  <button className="thread-replies-link" onClick={() => navigate(taskRoute(tasks.find(task => task.threadId === thread.id)!.id))}><span className="reply-avatars">{thread.messages.slice(0, 2).map(message => <Avatar key={message.id} person={personById(message.authorId)} small />)}</span>{thread.messages.length - 1} {thread.messages.length === 2 ? 'reply' : 'replies'}<span>View thread</span></button>
                </div>
              </article>)}
              <div className="feed-end"><MessageSquareText size={16} />Select a thread to read and reply.</div>
            </div>}
          </section>
          {selectedThread && <section className="teams-thread-pane" aria-label="Selected Teams thread">
            <div className="thread-pane-header"><button className="icon-button" aria-label="Back to board" onClick={() => navigate({ channelId: channel.id, view: 'board', taskId: route.taskId })}><ArrowLeft size={18} /></button><h2 ref={threadHeading} tabIndex={-1}>{selectedThread.title}</h2><button className="icon-button" aria-label="Close Teams thread" onClick={() => navigate({ channelId: channel.id, view: 'threads', taskId: route.taskId })}><X size={19} /></button></div>
            <div className="thread-scroll">
              <div className="thread-channel-label"><Hash size={13} />{channel.name}<span>Today</span></div>
              <div className="thread-messages" aria-live="polite">{selectedThread.messages.map((message, index) => <MessageItem key={message.id} message={message} root={index === 0} />)}</div>
              <button className="thread-task-link" onClick={() => navigate(taskRoute(tasks.find(task => task.threadId === selectedThread.id)!.id))}><Columns3 size={15} /><span>Workbench task #{tasks.find(task => task.threadId === selectedThread.id)!.id}</span><ArrowRight size={14} /></button>
            </div>
            <form className="reply-form" onSubmit={sendReply}>
              <label htmlFor="thread-reply">Send to: <strong>thread only</strong><ChevronDown size={12} /></label>
              <textarea ref={replyInput} id="thread-reply" placeholder="Reply or mention @Workbench" aria-label="Reply to this thread" aria-describedby="bot-reply-hint" value={reply} onChange={event => setReply(event.target.value)} />
              <div className="reply-tools"><span><Smile size={17} /><button className="mention-button" type="button" onClick={() => { setReply(current => `${current}${current && !/\s$/.test(current) ? ' ' : ''}@Workbench `); replyInput.current?.focus() }}><AtSign size={16} />Workbench</button></span><button className="icon-button" disabled={!reply.trim()} type="submit" aria-label="Send reply"><Send size={18} /></button></div>
              <span className="local-reply-note" id="bot-reply-hint">Mention @Workbench for a simulated bot reply. Local mock · resets on refresh.</span>
            </form>
          </section>}
          {selectedTask && <TaskDetails key={selectedTask.id} task={selectedTask} onChange={changeTask} onClose={() => navigate({ ...route, taskId: undefined })} onThread={() => { navigate(taskRoute(selectedTask.id)); threadHeading.current?.focus() }} />}
        </div>
      </main>
    </div>
  </div>
}

function TaskCard({ task, selected, onOpen }: { task: Task; selected: boolean; onOpen: () => void }) {
  return <button className={`task-card ${selected ? 'card-selected' : ''}`} onClick={onOpen} aria-label={`Open task ${task.id}: ${task.title}`}>
    <div className="card-topline"><TaskPill task={task} /><span className="task-number">#{task.id}</span><MoreHorizontal size={16} /></div>
    <div className="card-title-row">{task.status !== 'Completed' && <span className="unread-dot" />}<h4>{task.title}</h4></div>
    {task.status !== 'Not started' && task.checklist.length > 0 && <div className="card-checklist"><ChecklistTrack task={task} /></div>}
    <div className="card-metadata"><Avatar person={personById(task.ownerId)} small /><span className="repository-chip"><GitFork size={12} />northstar</span><span className={`task-label label-${task.label.toLowerCase().replaceAll(' ', '-')}`}>{task.label}</span></div>
  </button>
}

function MessageItem({ message, root }: { message: Message; root: boolean }) {
  const person = personById(message.authorId)
  return <article className={`thread-message ${root ? 'root-message' : ''}`}><Avatar person={person} presence /><div className="message-content"><div className="message-meta"><strong>{person.name}</strong>{person.id === workbenchBot.id && <span className="bot-badge">Bot · simulated</span>}<span>{message.time}</span></div><div className="thread-bubble"><p>{message.text}</p></div></div></article>
}

function TaskDetails({ task, onChange, onClose, onThread }: { task: Task; onChange: (task: Task) => void; onClose: () => void; onThread: () => void }) {
  const [checklistExpanded, setChecklistExpanded] = useState(false)
  const complete = task.checklist.filter(item => item.done).length
  return <aside className="task-details" aria-label={`Task ${task.id} details`}>
    <header className="detail-header"><div><span className="task-number">#{task.id}</span><h2>{task.title}</h2></div><Avatar person={personById(task.ownerId)} small /><button className="icon-button" aria-label="Close task details" onClick={onClose}><X size={18} /></button></header>
    <div className="detail-workspace">
      {task.status !== 'Not started' && task.checklist.length > 0 && <section className="pinned-checklist" aria-label="Task checklist">
        <div className="checklist-heading"><ChecklistTrack task={task} /><span className="checklist-summary-count">{complete}/{task.checklist.length}</span><button className="icon-button" aria-label={checklistExpanded ? 'Collapse task checklist' : 'Expand task checklist'} aria-expanded={checklistExpanded} onClick={() => setChecklistExpanded(!checklistExpanded)}><ChevronDown size={15} className={checklistExpanded ? 'chevron-expanded' : ''} /></button></div>
        {checklistExpanded && <><div className="checklist-steps">{task.checklist.map((item, index) => <Fragment key={item.text}>
          <label className={`checklist-row ${item.done ? 'checked' : ''}`}><input type="checkbox" checked={item.done} onChange={() => onChange({ ...task, checklist: task.checklist.map((entry, entryIndex) => entryIndex === index ? { ...entry, done: !entry.done } : entry) })} /><span>{item.text}</span>{item.done && <Check size={13} />}</label>
          {task.status === 'In progress' && task.checkInAfter === item.text && <div className="check-in-divider" role="note" aria-label={`Check-in after ${item.text}`}><span /><Pause size={12} />Check-in · After {item.text}<span /></div>}
        </Fragment>)}</div>
          {task.status === 'Ready for review' && <div className="check-in-divider"><span />Check-in · Preview<span /></div>}
          <div className="checklist-complete"><CircleCheck size={15} /><span>Complete</span><span>{complete === task.checklist.length ? 'Ready' : 'After checklist'}</span></div></>}
      </section>}
      <nav className="detail-tabs" aria-label="Task detail tabs">
        <span className="detail-section-label"><Settings2 size={15} />Properties</span>
        <button className="thread-tab" onClick={onThread}><MessageSquareText size={15} /><span>Teams thread</span></button>
      </nav>
      <section className="properties-card">
        <div className="properties-card-header"><StatusIcon status={task.status} /><select aria-label="Task status" value={task.status} onChange={event => onChange({ ...task, status: statuses.find(status => status === event.target.value)! })}>{statuses.map(status => <option key={status}>{status}</option>)}</select><span className="properties-owner"><Avatar person={personById(task.ownerId)} small />{personById(task.ownerId).name}</span></div>
        <div className="properties-metadata"><span className="repository-chip"><GitFork size={13} />northstar</span><span className="task-label">{task.label}</span></div>
        <div className="task-description"><p>{task.description}</p></div>
        <div className="task-properties-list"><div><span>Channel</span><span><Hash size={13} />{channels.find(channel => channel.id === task.channelId)!.name}</span></div><div><span>Conversation</span><button onClick={onThread}>Open Teams thread<ArrowRight size={13} /></button></div></div>
      </section>
    </div>
    <div className="detail-footer"><Columns3 size={13} /><span>ADX Workbench</span><span>Local mock</span></div>
  </aside>
}

export default App
