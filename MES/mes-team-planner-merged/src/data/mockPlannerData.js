export const mockUsers = [
  { id: 'u1', name: 'Oat', role: 'Admin', avatar: 'O' },
  { id: 'u2', name: 'P', role: 'Member', avatar: 'P' },
  { id: 'u3', name: 'May', role: 'Member', avatar: 'M' },
];

export const mockTasks = [
  {
    id: 't1',
    title: 'Review System Architecture',
    description: 'Review the newly created MES Team Planner architecture.',
    ownerId: 'u1',
    visibility: 'PUBLIC',
    status: 'IN_PROGRESS',
    type: 'TASK',
    date: '2026-07-07'
  },
  {
    id: 't2',
    title: 'Personal Note',
    description: 'Buy coffee beans after work.',
    ownerId: 'u1',
    visibility: 'PRIVATE',
    status: 'TODO',
    type: 'TASK',
    date: '2026-07-06'
  },
  {
    id: 't3',
    title: 'Team Meeting',
    description: 'Weekly sync up',
    ownerId: 'u1',
    visibility: 'PUBLIC',
    status: 'TODO',
    type: 'EVENT',
    date: '2026-07-08'
  },
  {
    id: 't4',
    title: 'Annual Leave (P)',
    description: 'Going on vacation',
    ownerId: 'u2',
    visibility: 'PUBLIC',
    status: 'DONE',
    type: 'LEAVE',
    date: '2026-07-09'
  }
];
