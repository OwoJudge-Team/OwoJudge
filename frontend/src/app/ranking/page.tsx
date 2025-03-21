'use client';

import { rankings } from '@/constants/rankings';

const RankingPage: React.FC = () => {
  return (
    <div className='bg-neutral-light min-h-screen p-8'>
      <div className='max-w-6xl mx-auto'>
        {/* Title */}
        <h1 className='text-4xl font-bold text-foreground mb-8'>Ranking</h1>

        {/* Rankings Table */}
        <div className='bg-white shadow-lg rounded-lg overflow-hidden'>
          <table className='w-full text-left'>
            <thead className='bg-primary-light text-white'>
              <tr>
                <th className='py-4 px-6'>#</th>
                <th className='py-4 px-6'>Name</th>
                <th className='py-4 px-6'>Points</th>
                <th className='py-4 px-6'>Problems Solved</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((ranking) => (
                <tr key={ranking.id} className='hover:bg-neutral transition'>
                  <td className='py-4 px-6'>{ranking.id}</td>
                  <td className='py-4 px-6'>{ranking.name}</td>
                  <td className='py-4 px-6'>{ranking.points}</td>
                  <td className='py-4 px-6'>{ranking.problemsSolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RankingPage;
