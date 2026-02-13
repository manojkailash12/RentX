import React, { useState } from "react";
import { assets } from "../assets/assets";
import { useAppContext } from "../context/AppContext";
import { motion } from 'motion/react'
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';

const Hero = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen flex items-center justify-center px-6 md:px-16 lg:px-24 xl:px-32 py-20 bg-white">
      
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left side - Text content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-6">
          
          <p className="text-sm text-gray-600 font-medium">{t('hero.planTrip')}</p>
          
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            {t('hero.saveBig')} <span className="text-green-600">{t('hero.big')}</span> {t('hero.withOur')}<br />
            {t('hero.carRental')}
          </h1>
          
          <p className="text-gray-600 text-lg max-w-xl">
            {t('hero.description')}
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/cars')}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg transition-all flex items-center gap-2">
            {t('hero.bookNow')}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </motion.div>

        {/* Right side - Car image */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative">
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            src={assets.main_car_2} 
            alt="car" 
            className="w-full h-auto drop-shadow-2xl" />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Hero;
