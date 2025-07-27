'use client';
import { SetStateAction, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { registerUser, googleLoginUser } from '@/lib/auth';
import { AxiosError } from 'axios';
import { ApiErrorResponse } from '@/types';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

type Easing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as Easing },
  },
};

const buttonVariants = {
  hover: { scale: 1.05, transition: { duration: 0.3 } },
  tap: { scale: 0.95 },
};

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      await registerUser(username, email, password);
      router.push('/login');
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(error.response?.data?.message || 'Registration failed');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      await googleLoginUser(credentialResponse.credential!);
      router.push('/dashboard');
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(error.response?.data?.message || 'Google registration failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-100 to-gray-100 p-4 sm:p-6 w-full">
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-[400px] bg-white border-2 border-[#dddd] rounded-3xl"
        style={{
          transform: 'perspective(1000px) rotateX(2deg) rotateY(2deg) translateY(0)',
          boxShadow: '6px 6px 0 0 #dddd',
          border: '1px solid #eeee',
          transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out, border 0.3s ease-in-out',
        }}
        onMouseEnter={(e) => {
          const card = e.currentTarget;
          card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(-8px)';
          card.style.boxShadow = '12px 12px 0 0 #dddd';
          card.style.border = '1px solid #eeee';
        }}
        onMouseLeave={(e) => {
          const card = e.currentTarget;
          card.style.transform = 'perspective(1000px) rotateX(2deg) rotateY(2deg) translateY(0)';
          card.style.boxShadow = '6px 6px 0 0 #dddd';
          card.style.border = '1px solid #eeee';
        }}
      >
        <Card className="border-none bg-transparent">
          <CardHeader className="pt-3">
            <CardTitle className="text-start text-3xl font-bold text-gray-900 break-words pt-2">
              Create Your Account
            </CardTitle>
            <p className="text-start text-md text-gray-600 mt-1">
              Get started by registering your details.
            </p>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e: { target: { value: SetStateAction<string> } }) =>
                  setUsername(e.target.value)
                }
                className={`w-full border ${
                  error ? 'border-red-500' : 'border-gray-300'
                } rounded-md px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e: { target: { value: SetStateAction<string> } }) =>
                  setEmail(e.target.value)
                }
                className={`w-full border ${
                  error ? 'border-red-500' : 'border-gray-300'
                } rounded-md px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e: { target: { value: SetStateAction<string> } }) =>
                  setPassword(e.target.value)
                }
                className={`w-full border ${
                  error ? 'border-red-500' : 'border-gray-300'
                } rounded-md px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
            </div>
            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Button
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors duration-300"
              >
                Register
              </Button>
            </motion.div>
            <div className="flex justify-center">
              <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                <div className="inline-block w-full">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google registration failed')}
                    theme="filled_blue"
                    shape="rectangular"
                    size="large"
                    text="signup_with"
                    width="350"
                  />
                </div>
              </motion.div>
            </div>
          </CardContent>
          <CardFooter className="justify-center pb-6">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}