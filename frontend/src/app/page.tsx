'use client';

import Link from 'next/link';

const HomePage: React.FC = () => {
  return (
    <div className='bg-neutral-light min-h-screen p-8'>
      <div className='max-w-6xl mx-auto text-center'>
        {/* Hero Section */}
        <section className='py-20'>
          <h1 className='text-5xl font-bold text-foreground mb-6'>Welcome to Our Coding Judge Platform</h1>
          <p className='text-xl text-gray-700 mb-8'>
            Sharpen your problem-solving skills, compete with others, and learn from a wide range of algorithmic
            challenges. Whether you&apos;re a beginner or an expert, we have something for you.
          </p>
          <Link href='/problems'>
            <button className='bg-primary-dark text-white py-3 px-8 rounded-xl hover:bg-primary transition'>
              Get Started
            </button>
          </Link>
        </section>

        {/* Key Features Section */}
        <section className='grid grid-cols-1 md:grid-cols-3 gap-8 py-16'>
          <div className='bg-white shadow-lg rounded-lg p-8'>
            <h3 className='text-2xl font-bold text-primary-dark mb-4'>Explore Problems</h3>
            <p className='text-lg text-gray-700 mb-4'>
              Solve a wide range of algorithmic problems from beginner to expert levels and track your progress.
            </p>
            <Link href='/problems'>
              <button className='text-primary-dark font-semibold hover:underline'>Browse Problems</button>
            </Link>
          </div>

          <div className='bg-white shadow-lg rounded-lg p-8'>
            <h3 className='text-2xl font-bold text-primary-dark mb-4'>Compete with Others</h3>
            <p className='text-lg text-gray-700 mb-4'>
              Climb the leaderboard by solving problems and competing against other users in real-time rankings.
            </p>
            <Link href='/ranking'>
              <button className='text-primary-dark font-semibold hover:underline'>View Rankings</button>
            </Link>
          </div>

          <div className='bg-white shadow-lg rounded-lg p-8'>
            <h3 className='text-2xl font-bold text-primary-dark mb-4'>Learn and Grow</h3>
            <p className='text-lg text-gray-700 mb-4'>
              Access detailed problem explanations and solutions to enhance your understanding and skills.
            </p>
            <Link href='/about'>
              <button className='text-primary-dark font-semibold hover:underline'>Learn More</button>
            </Link>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className='py-20'>
          <h2 className='text-4xl font-bold text-foreground mb-6'>Ready to take on the challenge?</h2>
          <p className='text-xl text-gray-700 mb-8'>
            Sign up and start solving problems today. Build your skills, earn points, and join a community of passionate
            coders.
          </p>
          <Link href='/signup'>
            <button className='bg-primary-dark text-white py-3 px-8 rounded-xl hover:bg-primary transition'>
              Join Now
            </button>
          </Link>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
