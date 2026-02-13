import React from 'react';
import { motion } from 'motion/react';
import Title from '../../components/Title';
import ReviewsManagement from '../../components/Admin/ReviewsManagement';
import BackButton from '../../components/BackButton';

const AdminReviews = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className='px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mt-16 max-w-7xl mx-auto'
    >
      <div className="mb-6">
        <BackButton />
      </div>
      <Title 
        title="Reviews Management" 
        subTitle="View, like, and share customer reviews" 
        align='left' 
      />
      
      <ReviewsManagement />
    </motion.div>
  );
};

export default AdminReviews;
