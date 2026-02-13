import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

const CarCard = ({car}) => {

    const currency = import.meta.env.VITE_CURRENCY
    const navigate = useNavigate();
    const { getImageUrl } = useAppContext();

  return (
    <div onClick={()=> {navigate(`/car-details/${car._id}`); scrollTo(0,0)}} className='group rounded-xl overflow-hidden shadow-lg hover:-translate-y-1 transition-all duration-500 cursor-pointer'>
        <div className='relative h-48 overflow-hidden'>
            <img src={getImageUrl(car.image) || assets.car_image1} alt="Car Image" className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-105'/>

            {/* Show booking status */}
            {car.isCurrentlyBooked ? (
                <p className='absolute top-4 left-4 bg-red-500/90 text-white text-xs px-2.5 py-1 rounded-full'>Currently Booked</p>
            ) : car.isAvailable ? (
                <p className='absolute top-4 left-4 bg-primary/90 text-white text-xs px-2.5 py-1 rounded-full'>Available Now</p>
            ) : (
                <p className='absolute top-4 left-4 bg-gray-500/90 text-white text-xs px-2.5 py-1 rounded-full'>Unavailable</p>
            )}

            <div className='absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg '>
                <span className='font-semibold'>{currency} {car.pricePerDay}</span>
                <span className='text-sm text-white/80'> / day</span>
            </div>
        </div>

        <div className='p-4 sm:p-5'>
            <div className=' flex justify-between items-start mb-2'>
                <div>
                    <h3 className='text-lg font-medium'>{car.brand} {car.model}</h3>
                    <p className='text-muted-foreground text-sm'>{car.category} • {car.year}</p>
                </div>
            </div>

            {/* Average Rating Display */}
            {car.averageRating > 0 && (
                <div className='flex items-center gap-2 mt-2 mb-3'>
                    <div className='flex text-yellow-400 text-sm'>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star}>
                                {star <= Math.round(car.averageRating) ? '★' : '☆'}
                            </span>
                        ))}
                    </div>
                    <span className='text-sm font-medium text-gray-700'>
                        {car.averageRating.toFixed(1)}
                    </span>
                    <span className='text-xs text-gray-500'>
                        ({car.totalReviews || 0})
                    </span>
                </div>
            )}

            <div className='mt-4 grid grid-cols-2 gap-y-2 text-gray-600'>
                <div className='flex items-center text-sm text-muted-foreground'>
                    <img src={assets.users_icon} alt="" className='h-4 mr-2'/>
                    <span>{car.seating_capacity} Seats</span>
                </div>
                <div className='flex items-center text-sm text-muted-foreground'>
                    <img src={assets.fuel_icon} alt="" className='h-4 mr-2'/>
                    <span>{car.fuel_type}</span>
                </div>
                <div className='flex items-center text-sm text-muted-foreground'>
                    <img src={assets.car_icon} alt="" className='h-4 mr-2'/>
                    <span>{car.transmission}</span>
                </div>
                <div className='flex items-center text-sm text-muted-foreground'>
                    <img src={assets.location_icon} alt="" className='h-4 mr-2'/>
                    <span>{car.location}</span>
                </div>
            </div>

        </div>

    </div>
  )
}

export default CarCard