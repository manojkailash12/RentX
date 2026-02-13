import React, { useEffect, useState } from 'react'
import Title from '../components/Title'
import { assets, dummyCarData } from '../assets/assets'
import CarCard from '../components/CarCard'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import BackButton from '../components/BackButton'
import CarRecommendations from '../components/CarRecommendations'

const Cars = () => {
  const { t } = useTranslation();

  // getting search param from url
  const [searchParams] = useSearchParams()
  const pickupLocation = searchParams.get('pickupLocation')
  const pickupDate = searchParams.get('pickupDate')
  const returnDate = searchParams.get('returnDate')

  const { cars, axios, isAdmin, fetchCars } = useAppContext();
  const navigate = useNavigate();

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const isSearchData = pickupLocation && pickupDate && returnDate
  const [filteredCars, setFilteredCars] = useState([])

  const refreshCars = async () => {
    setLoading(true);
    await fetchCars();
    setLoading(false);
  };

  const applyFilter = async () => {
    if (input === '') {
      setFilteredCars(cars)
      return null
    }

    const filtered = cars.slice().filter((car) => {
      return car.brand.toLowerCase().includes(input.toLocaleLowerCase())
        || car.model.toLowerCase().includes(input.toLocaleLowerCase())
        || car.category.toLowerCase().includes(input.toLocaleLowerCase())
        || car.transmission.toLowerCase().includes(input.toLocaleLowerCase())
    })
    setFilteredCars(filtered)
  }

  const searchCarAvailability = async () => {
    const { data } = await axios.post('/bookings/check-availability', { location: pickupLocation, pickupDate, returnDate })
    if (data.success) {
      setFilteredCars(data.availableCars)
      if (data.availableCars.length === 0) {
        toast('No cars available')
      }
      return null
    }
  }

  useEffect(() => {
    isSearchData && searchCarAvailability()
  }, [])

  useEffect(() => {
    cars.length > 0 && !isSearchData && applyFilter()
  }, [input, cars])

  return (
    <div>
      <div className="px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-48 pt-6">
        <BackButton />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className='flex flex-col items-center py-20 bg-light max-md:px-4'>
        <Title 
          title={isAdmin ? t('cars.platformInventory') : t('cars.title')} 
          subTitle={isAdmin ? t('cars.managePlatform') : t('cars.subtitle')} 
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className='flex items-center bg-white px-4 mt-6 max-w-140 w-full h-12 rounded-full shadow'>
          <img src={assets.search_icon} alt="" className='w-4.5 h-4.5 mr-2' />

          <input onChange={(e) => setInput(e.target.value)} value={input} type="text" placeholder={t('cars.searchPlaceholder')} className='w-full h-full outline-none text-gray-500' />

          <img src={assets.filter_icon} alt="" className='w-4.5 h-4.5 ml-2' />
        </motion.div>

        {/* Add Car button for Admin */}
        {isAdmin && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            onClick={() => navigate('/owner/add-car')}
            className='flex items-center gap-2 bg-primary hover:bg-primary-dull text-white px-6 py-3 rounded-lg mt-4 transition-all duration-300'
          >
            <img src={assets.addIconColored} alt="add" className='w-5 h-5 filter brightness-0 invert' />
            {t('cars.addNewCar')}
          </motion.button>
        )}

      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className='px-6 md:px-16 lg:px-24 xl:px-32 mt-10'>
        
        {/* AI-Powered Recommendations */}
        <div className='xl:px-20 max-w-7xl mx-auto mb-10'>
          <CarRecommendations />
        </div>

        <div className='flex justify-between items-center xl:px-20 max-w-7xl mx-auto mb-4'>
          <p className='text-gray-500'>
            {isAdmin ? `${t('cars.managing')} ${filteredCars.length} ${t('cars.platformCars')}` : `${t('cars.showing')} ${filteredCars.length} ${t('nav.cars')}`}
          </p>
          <button
            onClick={refreshCars}
            disabled={loading}
            className='flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50'
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? t('cars.refreshing') : t('cars.refresh')}
          </button>
        </div>
        
        {filteredCars.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-20 xl:px-20 max-w-7xl mx-auto'>
            <img src={assets.car_icon} alt="No cars" className='w-20 h-20 opacity-20 mb-4' />
            <p className='text-gray-500 text-lg mb-2'>{t('cars.noCars')}</p>
            <p className='text-gray-400 text-sm mb-6'>
              {isAdmin ? t('cars.addFirst') : t('cars.checkBack')}
            </p>
            {isAdmin && (
              <button
                onClick={() => navigate('/owner/add-car')}
                className='flex items-center gap-2 bg-primary hover:bg-primary-dull text-white px-6 py-3 rounded-lg transition-all duration-300'
              >
                <img src={assets.addIconColored} alt="add" className='w-5 h-5 filter brightness-0 invert' />
                {t('cars.addNewCar')}
              </button>
            )}
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-4 xl:px-20 max-w-7xl mx-auto '>
            {filteredCars.map((car, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                key={index}>
                <CarCard car={car} />
              </motion.div>
            ))}
          </div>
        )}

      </motion.div>

    </div>
  )
}

export default Cars