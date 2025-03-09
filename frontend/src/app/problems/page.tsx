'use client';

import Link from 'next/link';

const problems = [
  { id: 1, title: 'Binary Search', difficulty: 'Easy', submissions: 450, accuracy: '85%' },
  { id: 2, title: 'Two Sum', difficulty: 'Medium', submissions: 1200, accuracy: '67%' },
  { id: 3, title: 'Travelling Salesman', difficulty: 'Hard', submissions: 350, accuracy: '45%' },
  { id: 4, title: 'Merge Sort', difficulty: 'Easy', submissions: 550, accuracy: '90%' },
  { id: 5, title: 'Quick Sort', difficulty: 'Medium', submissions: 1100, accuracy: '78%' },
  { id: 6, title: 'Depth-First Search', difficulty: 'Medium', submissions: 900, accuracy: '72%' },
  { id: 7, title: 'Breadth-First Search', difficulty: 'Medium', submissions: 950, accuracy: '80%' },
  { id: 8, title: 'Dynamic Programming', difficulty: 'Hard', submissions: 600, accuracy: '60%' },
  { id: 9, title: 'Linked List Reversal', difficulty: 'Easy', submissions: 700, accuracy: '92%' },
  { id: 10, title: 'Knapsack Problem', difficulty: 'Hard', submissions: 400, accuracy: '55%' },
  { id: 11, title: 'Maximum Subarray Sum', difficulty: 'Easy', submissions: 600, accuracy: '88%' },
  { id: 12, title: 'Floyd-Warshall Algorithm', difficulty: 'Hard', submissions: 250, accuracy: '48%' },
  { id: 13, title: "Dijkstra's Algorithm", difficulty: 'Medium', submissions: 850, accuracy: '70%' },
  { id: 14, title: "Prim's Algorithm", difficulty: 'Medium', submissions: 780, accuracy: '77%' },
  { id: 15, title: 'Topological Sorting', difficulty: 'Hard', submissions: 300, accuracy: '52%' },
];

const ProblemPage: React.FC = () => {
  return (
    <div className='bg-neutral-light min-h-screen p-8'>
      <div className='max-w-6xl mx-auto'>
        {/* Title */}
        <h1 className='text-4xl font-bold text-foreground mb-8'>Problems</h1>

        {/* Problems Table */}
        <div className='bg-white shadow-lg rounded-lg'>
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
