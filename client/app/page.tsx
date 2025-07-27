
'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Easing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut' as Easing,
    },
  },
};

const buttonVariants = {
  hover: {
    scale: 1.05,
    transition: { duration: 0.3 },
  },
  tap: { scale: 0.95 },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 flex flex-col overflow-x-hidden">
      <motion.section
        className="flex flex-col items-center justify-center text-center py-16 md:py-24 px-4 sm:px-6 lg:px-8 min-h-[70vh]"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 tracking-tight"
          variants={itemVariants}
        >
          Welcome to Secure File Storage
        </motion.h1>
        <motion.p
          className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
          variants={itemVariants}
        >
          Securely store, manage, and share your files with ease. Our platform offers top-notch security and seamless access to your data.
        </motion.p>
        <motion.div
          className="flex flex-col sm:flex-row gap-4"
          variants={itemVariants}
        >
          <Link href="/login">
            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base sm:text-lg rounded-full transition-colors duration-300">
                Get Started
              </Button>
            </motion.div>
          </Link>
          <Link href="/register">
            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Button
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-3 text-base sm:text-lg rounded-full transition-colors duration-300"
              >
                Register
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </motion.section>

      <motion.section
        className="py-16 px-4 sm:px-6 lg:px-8 bg-white"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h2
          className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12 tracking-tight"
          variants={itemVariants}
        >
          Why Choose Us?
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto h-full">
          {[
            {
              title: 'Secure Storage',
              description: 'Your files are encrypted with industry-standard security protocols to ensure maximum protection.',
              icon: '🔒',
            },
            {
              title: 'Easy Access',
              description: 'Access your files anytime, anywhere, with our user-friendly interface.',
              icon: '🌐',
            },
            {
              title: 'Fast Uploads',
              description: 'Upload and download files quickly with our optimized infrastructure.',
              icon: '⚡',
            },
          ].map((feature, index) => (
            <motion.div key={index} variants={itemVariants} className="flex h-full">
              <Card className="flex flex-col shadow-lg hover:shadow-xl transition-all duration-300 border-none bg-gradient-to-br from-gray-50 to-gray-100 flex-1">
                <CardHeader>
                  <div className="text-4xl mb-2">{feature.icon}</div>
                  <CardTitle className="text-xl font-semibold text-gray-800">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.footer
        className="py-8 px-4 bg-gray-800 text-white text-center"
        variants={itemVariants}
      >
        <p className="text-sm sm:text-base">
          &copy; {new Date().getFullYear()} Secure File Storage. All rights reserved.
        </p>
      </motion.footer>
    </div>
  );
}
