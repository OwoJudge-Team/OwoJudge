"use client";

import Link from "next/link";

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-light p-8">
      <div className="mx-auto max-w-6xl text-center">
        {/* Hero Section */}
        <section className="py-20">
          <h1 className="mb-6 text-5xl font-bold text-foreground">
            Welcome to Our Coding Judge Platform
          </h1>
          <p className="mb-8 text-xl text-gray-700">
            Sharpen your problem-solving skills, compete with others, and learn from a wide range of
            algorithmic challenges. Whether you&apos;re a beginner or an expert, we have something
            for you.
          </p>
          <Link href="/problems">
            <button className="rounded-xl bg-primary-dark px-8 py-3 text-white transition hover:bg-primary">
              Get Started
            </button>
          </Link>
        </section>

        {/* Key Features Section */}
        <section className="grid grid-cols-1 gap-8 py-16 md:grid-cols-3">
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <h3 className="mb-4 text-2xl font-bold text-primary-dark">Explore Problems</h3>
            <p className="mb-4 text-lg text-gray-700">
              Solve a wide range of algorithmic problems from beginner to expert levels and track
              your progress.
            </p>
            <Link href="/problems">
              <button className="font-semibold text-primary-dark hover:underline">
                Browse Problems
              </button>
            </Link>
          </div>

          <div className="rounded-lg bg-white p-8 shadow-lg">
            <h3 className="mb-4 text-2xl font-bold text-primary-dark">Compete with Others</h3>
            <p className="mb-4 text-lg text-gray-700">
              Climb the leaderboard by solving problems and competing against other users in
              real-time rankings.
            </p>
            <Link href="/ranking">
              <button className="font-semibold text-primary-dark hover:underline">
                View Rankings
              </button>
            </Link>
          </div>

          <div className="rounded-lg bg-white p-8 shadow-lg">
            <h3 className="mb-4 text-2xl font-bold text-primary-dark">Learn and Grow</h3>
            <p className="mb-4 text-lg text-gray-700">
              Access detailed problem explanations and solutions to enhance your understanding and
              skills.
            </p>
            <Link href="/about">
              <button className="font-semibold text-primary-dark hover:underline">
                Learn More
              </button>
            </Link>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-20">
          <h2 className="mb-6 text-4xl font-bold text-foreground">
            Ready to take on the challenge?
          </h2>
          <p className="mb-8 text-xl text-gray-700">
            Sign up and start solving problems today. Build your skills, earn points, and join a
            community of passionate coders.
          </p>
          <Link href="/signup">
            <button className="rounded-xl bg-primary-dark px-8 py-3 text-white transition hover:bg-primary">
              Join Now
            </button>
          </Link>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
