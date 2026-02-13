import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Hero from "../components/Hero";
import CarRecommendations from "../components/CarRecommendations";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

const Home = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, setUser, token } = useAppContext();

  useEffect(() => {
    // Handle email verification redirect
    const verification = searchParams.get('verification');
    const token = searchParams.get('token');
    const name = searchParams.get('name');
    const role = searchParams.get('role');
    const message = searchParams.get('message');

    if (verification === 'success' && token) {
      // Store token and user data
      localStorage.setItem('token', token);
      setToken(token);
      
      if (name && role) {
        const userData = {
          name: decodeURIComponent(name),
          role: role
        };
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }

      toast.success('Email verified successfully! Welcome to RentX!');
      
      // Clean URL
      navigate('/', { replace: true });
    } else if (verification === 'failed') {
      toast.error(message ? decodeURIComponent(message) : 'Email verification failed');
      navigate('/', { replace: true });
    } else if (verification === 'already') {
      toast.info('Email already verified. Please login.');
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate, setToken, setUser]);

  return (
    <div className="overflow-hidden">
      <Hero />
      
      {/* AI-Powered Recommendations - Only show for logged in users */}
      {token && (
        <div className="px-6 md:px-16 lg:px-24 xl:px-32 py-10 bg-gray-50">
          <CarRecommendations />
        </div>
      )}
    </div>
  );
};

export default Home;
