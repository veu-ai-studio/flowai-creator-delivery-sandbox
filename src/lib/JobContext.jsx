/**
 * JobContext — Global async job queue.
 * Jobs are stored in localStorage so they survive navigation.
 * Engines post updates via callbacks; the context polls for completion.
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const JobContext = createContext(null);

const STORAGE_KEY = 'flowai_jobs';

function loadJobs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveJobs(jobs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(-50))); // keep last 50
}

let _setJobs = null; // module-level setter so engines outside React can push updates

export function JobProvider({ children }) {
  const [jobs, setJobs] = useState(() => loadJobs());

  // Keep module-level ref in sync so external callers can push updates
  _setJobs = setJobs;

  // Persist on every change
  useEffect(() => {
    saveJobs(jobs);
  }, [jobs]);

  const createJob = useCallback(({ type, label, meta = {} }) => {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      label,
      meta,
      status: 'pending',
      progress: 0,
      result: null,
      error: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    setJobs(prev => [job, ...prev]);
    return job.id;
  }, []);

  const updateJob = useCallback((id, patch) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j));
  }, []);

  const removeJob = useCallback((id) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(j => j.status === 'running' || j.status === 'pending'));
  }, []);

  return (
    <JobContext.Provider value={{ jobs, createJob, updateJob, removeJob, clearCompleted }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJobs() {
  return useContext(JobContext);
}

// Called by engine runners to push real-time updates without needing the hook
export function pushJobUpdate(id, patch) {
  if (_setJobs) {
    _setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j));
  }
}