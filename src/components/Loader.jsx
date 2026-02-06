import React from 'react'

const Loader = ({ size = 'md', text = '' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-14 w-14 border-4',
    lg: 'h-20 w-20 border-4'
  };

  return (
    <div className='flex flex-col justify-center items-center h-[80vh] gap-4'>
        <div className={`animate-spin rounded-full ${sizeClasses[size]} border-gray-300 border-t-primary`}></div>
        {text && <p className="text-gray-600 text-sm animate-pulse">{text}</p>}
    </div>
  )
}

export default Loader