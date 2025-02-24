'use client';

import Link from 'next/link';

const navItems = [
  { name: 'Problems', href: '/problems' },
  { name: 'Submissions', href: '/submissions' },
  { name: 'Ranking', href: '/ranking' },
  { name: 'About', href: '/about' },
];

const Header: React.FC = () => {
  return (
    <header className='bg-indigo-700 p-4 shadow-lg'>
      <div className='max-w-7xl mx-auto flex justify-between items-center'>
        {/* Logo */}
        <Link href='/' className='text-white text-3xl font-bold hover:text-gray-200 transition'>
          OwoJudge
        </Link>

        {/* Navigation */}
        <nav className='flex space-x-8'>
          {navItems.map((item) => (
            <Link key={item.name} href={item.href} className='text-white text-lg hover:text-gray-200 transition'>
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Login Button */}
        <Link
          href='/login'
          className='bg-white text-indigo-600 px-5 py-2 rounded-full font-semibold shadow hover:bg-gray-200 transition'
        >
          Login
        </Link>
      </div>
    </header>
  );
};

export default Header;
