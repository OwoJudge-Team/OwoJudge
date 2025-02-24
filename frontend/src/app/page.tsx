'use client';

import { useState } from 'react';

const Home: React.FC = () => {
  const [contest, setContest] = useState<string | null>(null);
  return (
    <main className='p-8'>
      <div className='bg-white shadow-lg rounded-lg p-6 max-w-2xl mx-auto'>
        <h2 className='text-2xl font-semibold mb-4'>Welcome to OwoJudge</h2>
        <p className='mb-6 text-gray-600'>Choose a contest below to get started.</p>

        <div className='grid gap-4'>
          <button
            onClick={() => setContest('Beginner Contest')}
            className='w-full bg-indigo-500 text-white p-3 rounded-md hover:bg-indigo-600 transition'
          >
            Beginner Contest
          </button>
          <button
            onClick={() => setContest('Intermediate Contest')}
            className='w-full bg-indigo-500 text-white p-3 rounded-md hover:bg-indigo-600 transition'
          >
            Intermediate Contest
          </button>
          <button
            onClick={() => setContest('Advanced Contest')}
            className='w-full bg-indigo-500 text-white p-3 rounded-md hover:bg-indigo-600 transition'
          >
            Advanced Contest
          </button>
        </div>

        {contest && (
          <div className='mt-6 p-4 bg-green-50 border-l-4 border-green-400'>
            <p className='text-green-700'>
              You selected: <strong>{contest}</strong>. Get ready to code!
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default Home;
