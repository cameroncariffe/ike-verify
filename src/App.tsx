import { useState } from 'react';
import { ValidationWorkbench } from './pages/ValidationWorkbench';
import { mockJob } from './data/mockData';
import type { Job } from './types';

export default function App() {
  const [job, setJob] = useState<Job>(mockJob);
  return <ValidationWorkbench job={job} onJobUpdate={setJob} />;
}
