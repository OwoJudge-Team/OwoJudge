'use client';

import Link from 'next/link';

const navItems = [
  { name: 'Problems', href: '/problems' },
  { name: 'Submissions', href: '/submissions' },
  { name: 'Contests', href: '/contests' },
  { name: 'Ranking', href: '/ranking' },
  { name: 'About', href: '/about' },
];

const Header: React.FC = () => {
  return (
    <header className='bg-primary p-4 shadow-lg'>
      <div className='max-w-6xl mx-auto flex items-center'>
        {/* Logo */}
        <Link
          href='/'
          className='text-white text-3xl font-bold hover:text-gray-200 transition duration-300 transform hover:scale-105'
        >
          OwoJudge
        </Link>

        {/* Navigation + Login */}
        <div className='flex items-center space-x-8 ml-auto'>
          <nav className='flex space-x-8'>
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className='text-white text-lg hover:text-gray-200 transition duration-300'
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <Link
            href='/login'
            className='bg-white text-primary-dark px-5 py-2 rounded-full font-semibold shadow hover:bg-gray-200 transition duration-300'
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
