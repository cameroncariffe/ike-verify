import { useState, useCallback } from 'react';
import { ValidationWorkbench } from './pages/ValidationWorkbench';
import { makeInitialJob } from './data/mockData';
import type { Job } from './types';

export default function App() {
  const [job, setJob] = useState<Job>(makeInitialJob);
  // Bumping the key remounts the workbench so all transient UI state
  // (selected pole, open panels, edit mode) clears on reset.
  const [resetKey, setResetKey] = useState(0);

  const handleReset = useCallback(() => {
    setJob(makeInitialJob());
    setResetKey(k => k + 1);
  }, []);

  return (
    <ValidationWorkbench
      key={resetKey}
      job={job}
      onJobUpdate={setJob}
      onResetPrototype={handleReset}
    />
  );
}
