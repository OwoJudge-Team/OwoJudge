'use client';

import Link from 'next/link';
import { problems } from './data';

const ProblemPage: React.FC = () => {
  return (
    <div className='bg-neutral-light min-h-screen p-8'>
      <div className='max-w-6xl mx-auto'>
        {/* Title */}
        <h1 className='text-4xl font-bold text-foreground mb-8'>Problems</h1>

        {/* Problems Table */}
        <div className='bg-white shadow-lg rounded-lg overflow-hidden'>
          <table className='w-full text-left'>
            <thead className='bg-primary-light text-white'>
              <tr>
                <th className='py-4 px-6'>#</th>
                <th className='py-4 px-6'>Title</th>
                <th className='py-4 px-6'>Difficulty</th>
                <th className='py-4 px-6'>Submissions</th>
                <th className='py-4 px-6'>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => (
                <tr key={problem.id} className='hover:bg-neutral transition'>
                  <td className='py-4 px-6'>{problem.id}</td>
                  <td className='py-4 px-6'>
                    <Link
                      href={`/problems/${problem.id}`}
                      className='text-primary-dark font-semibold hover:underline transition'
                    >
                      {problem.title}
                    </Link>
                  </td>
                  <td className={`py-4 px-6 ${getDifficultyColor(problem.difficulty)}`}>{problem.difficulty}</td>
                  <td className='py-4 px-6'>{problem.submissions}</td>
                  <td className='py-4 px-6'>{problem.accuracy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'Easy':
      return 'text-green-600';
    case 'Medium':
      return 'text-yellow-500';
    case 'Hard':
      return 'text-red-600';
    default:
      return '';
  }
};

export default ProblemPage;
