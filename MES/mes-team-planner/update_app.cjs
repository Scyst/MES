  const pageContent = useMemo(() => {
    const isAppLoading = dataLoading || userLoading;
    const sharedTaskProps = { currentUser, tasks, setTasks, onSaveTask: handleSaveTask, onDeleteTask: handleDeleteTask, loading: isAppLoading, users };

    switch (activeTab) {
      case 'dashboard': 
        return <Dashboard 
          tasks={tasks} 
          events={events} 
          activities={activities} 
          loading={isAppLoading} 
          users={users}
          currentUser={currentUser}
          onNav={handleNav} 
          openTaskModal={() => { setGlobalEditingTask(null); setIsGlobalTaskModalOpen(true); }}
          openProjectModal={() => { setGlobalEditingProject(null); setIsGlobalProjectModalOpen(true); }}
          openSpaceModal={canManageSpace(currentUser) ? () => { setEditingSpace(null); setIsAddSpaceModalOpen(true); } : undefined}
          openInviteModal={() => { setInviteModalSpaceId(null); setIsInviteModalOpen(true); }}
          onTaskClick={(task) => { setGlobalEditingTask(task); setIsGlobalTaskModalOpen(true); }}
          onProjectClick={(proj) => { setGlobalEditingProject(proj); setIsGlobalProjectModalOpen(true); }}
        />;
      case 'calendar': 
        return <CalendarView tasks={tasks} events={events} onSaveTask={handleSaveTask} onDeleteTask={handleDeleteTask} onSaveEvent={handleSaveEvent} onDeleteEvent={handleDeleteEvent} loading={isAppLoading} users={users} />;
      case 'tasks': 
        return <TaskBoard {...sharedTaskProps} />;
      case 'gantt': 
        return <GanttChart {...sharedTaskProps} />;
      case 'projects':
        return <ProjectsTab currentUser={currentUser} tasks={tasks} spaces={spaces} refreshData={refreshData} />;
      case 'links': 
        return <LinkHub />;
      case 'my-tasks':
        return <MyTasks 
          tasks={tasks} 
          currentUser={currentUser} 
          refreshData={refreshData} 
          onSaveTask={handleSaveTask}
        />;
      case 'timeline':
        return <GanttChart {...sharedTaskProps} />;
      case 'resources':
        return <Resources currentUser={currentUser} />;
      default: 
        return <Dashboard tasks={tasks} events={events} activities={activities} loading={isAppLoading} users={users} currentUser={currentUser} onNav={handleNav} />;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tasks, events, activities, projects, spaces, users, dataLoading, userLoading, currentUser]);
