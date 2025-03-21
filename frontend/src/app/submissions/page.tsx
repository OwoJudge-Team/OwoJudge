'use client';

import { useState } from 'react';
import { submissions } from './data';

const SubmissionPage: React.FC = () => {
  const [view, setView] = useState<'global' | 'user'>('global'); // Switch between global/user submissions
  const [searchUser, setSearchUser] = useState('');
  const [searchProblem, setSearchProblem] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Function to filter submissions based on the search and filters
  const filteredSubmissions = submissions.filter((submission) => {
    return (
      (view === 'global' || submission.user === 'alice') && // Replace 'alice' with current logged-in user
      (!searchUser || submission.user.toLowerCase().includes(searchUser.toLowerCase())) &&
      (!searchProblem || submission.problem.toLowerCase().includes(searchProblem.toLowerCase())) &&
      (!filterLanguage || submission.language === filterLanguage) &&
      (!filterStatus || submission.status === filterStatus)
    );
  });

  return (
    <div className='min-h-screen bg-neutral-light p-8'>
      <div className='max-w-6xl mx-auto'>
        {/* Title */}
        <h1 className='text-4xl font-bold text-foreground mb-6'>Submissions</h1>

        {/* View Switch (Global/User Submissions) */}
        <div className='mb-4 flex items-center'>
          <button
            onClick={() => setView('global')}
            className={`mr-4 px-4 py-2 rounded-lg ${
              view === 'global' ? 'bg-primary text-white' : 'bg-neutral text-black'
            } transition`}
          >
            Global Submissions
          </button>
          <button
            onClick={() => setView('user')}
            className={`px-4 py-2 rounded-lg ${
              view === 'user' ? 'bg-primary text-white' : 'bg-neutral text-black'
            } transition`}
          >
            My Submissions
          </button>
        </div>

        {/* Filters */}
        <div className='bg-white shadow-lg rounded-lg p-4 mb-6'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {/* User Search */}
            <input
              type='text'
              placeholder='Search by User'
              className='w-full p-2 border rounded-lg'
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
            />
            {/* Problem Search */}
            <input
              type='text'
              placeholder='Search by Problem'
              className='w-full p-2 border rounded-lg'
              value={searchProblem}
              onChange={(e) => setSearchProblem(e.target.value)}
            />
            {/* Language Filter */}
            <select
              className='w-full p-2 border rounded-lg'
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
            >
              <option value=''>Filter by Language</option>
              <option value='Python'>Python</option>
              <option value='C++'>C++</option>
              <option value='JavaScript'>JavaScript</option>
              <option value='Java'>Java</option>
              {/* Add more languages as necessary */}
            </select>
            {/* Status Filter */}
            <select
              className='w-full p-2 border rounded-lg'
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value=''>Filter by Status</option>
              <option value='AC'>AC (Accepted)</option>
              <option value='WA'>WA (Wrong Answer)</option>
              <option value='TLE'>TLE (Time Limit Exceeded)</option>
              <option value='MLE'>MLE (Memory Limit Exceeded)</option>
              {/* Add more statuses as necessary */}
            </select>
          </div>
        </div>

        {/* Submissions Table */}
        <div className='bg-white shadow-lg rounded-lg overflow-hidden'>
          <table className='w-full text-left'>
            <thead className='bg-primary-light text-white'>
              <tr>
                <th className='py-4 px-6'>#</th>
                <th className='py-4 px-6'>User</th>
                <th className='py-4 px-6'>Problem</th>
                <th className='py-4 px-6'>Language</th>
                <th className='py-4 px-6'>Status</th>
                <th className='py-4 px-6'>Time</th>
                <th className='py-4 px-6'>Memory</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className='hover:bg-neutral transition'>
                  <td className='py-4 px-6'>{submission.id}</td>
                  <td className='py-4 px-6'>{submission.user}</td>
                  <td className='py-4 px-6'>{submission.problem}</td>
                  <td className='py-4 px-6'>{submission.language}</td>
                  <td className={`py-4 px-6 ${getStatusColor(submission.status)}`}>{submission.status}</td>
                  <td className='py-4 px-6'>{submission.time}</td>
                  <td className='py-4 px-6'>{submission.memory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Helper function to get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'AC':
      return 'text-green-600';
    case 'WA':
      return 'text-red-600';
    case 'TLE':
      return 'text-blue-500';
    case 'MLE':
      return 'text-purple-500';
    default:
      return '';
  }
};

export default SubmissionPage;
