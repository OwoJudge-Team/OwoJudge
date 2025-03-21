'use client';

const AboutPage: React.FC = () => {
  return (
    <div className='bg-neutral-light min-h-screen p-8'>
      <div className='max-w-4xl mx-auto'>
        {/* Title */}
        <h1 className='text-4xl font-bold text-foreground mb-8'>About Us</h1>

        {/* Intro Section */}
        <section className='bg-white shadow-lg rounded-lg p-8 mb-8'>
          <h2 className='text-3xl font-semibold text-primary-dark mb-4'>Our Mission</h2>
          <p className='text-lg text-gray-700 leading-relaxed'>
            Welcome to our online judge platform! Our goal is to provide an engaging and challenging environment for
            problem solvers, coding enthusiasts, and aspiring developers to hone their skills. We offer a wide variety
            of problems across different difficulty levels to help you grow and succeed in the world of programming.
          </p>
        </section>

        {/* Features Section */}
        <section className='bg-white shadow-lg rounded-lg p-8 mb-8'>
          <h2 className='text-3xl font-semibold text-primary-dark mb-4'>What We Offer</h2>
          <ul className='list-disc list-inside text-lg text-gray-700'>
            <li className='mb-2'>A wide range of algorithmic problems for all skill levels</li>
            <li className='mb-2'>Real-time submission and scoring system</li>
            <li className='mb-2'>Interactive ranking system to compete with others</li>
            <li className='mb-2'>Detailed problem explanations and solutions</li>
            <li className='mb-2'>Community-driven platform to share knowledge and help each other</li>
          </ul>
        </section>

        {/* Team Section */}
        <section className='bg-white shadow-lg rounded-lg p-8'>
          <h2 className='text-3xl font-semibold text-primary-dark mb-4'>Meet the Team</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <div>
              <h3 className='text-xl font-bold text-foreground mb-2'>HyperSoWeak</h3>
              <p className='text-lg text-gray-700 leading-relaxed'>
                HyperSoWeak is the lead developer and creator of this platform, with a passion for algorithm design and
                game development. He strives to bring creative challenges to life and create an engaging learning
                experience for users.
              </p>
            </div>
            <div>
              <h3 className='text-xl font-bold text-foreground mb-2'>Development Team</h3>
              <p className='text-lg text-gray-700 leading-relaxed'>
                A dedicated group of developers and enthusiasts who have contributed their time and expertise to build
                this platform. Together, they aim to create a smooth and enjoyable problem-solving experience for all
                users.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
