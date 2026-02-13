import React, { useState, useEffect } from 'react'
import InteractiveChargingMap from '../../components/Charging/InteractiveChargingMap'
import BackButton from '../../components/BackButton'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'

const ChargingStations = () => {
  const { axios, isAdmin } = useAppContext()
  const [userLocation, setUserLocation] = useState(null)
  const [seeding, setSeeding] = useState(false)
  const [locationError, setLocationError] = useState(false)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setLocationError(false)
        },
        (error) => {
          console.error('Error getting location:', error)
          setLocationError(true)
          // Use default Hyderabad location if geolocation fails
          setUserLocation({
            lat: 17.4239,
            lng: 78.4376
          })
          toast.error('Could not get your location. Showing Hyderabad area.')
        }
      )
    } else {
      setLocationError(true)
      // Use default location
      setUserLocation({
        lat: 17.4239,
        lng: 78.4376
      })
      toast.error('Geolocation not supported. Showing Hyderabad area.')
    }
  }, [])

  const handleSeedStations = async () => {
    setSeeding(true)
    try {
      const { data } = await axios.post('/charging/seed')
      if (data.success) {
        toast.success(data.message)
        // Reload the page to show new stations
        window.location.reload()
      }
    } catch (error) {
      toast.error('Failed to seed charging stations')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className='px-4 pt-10 md:px-10 flex-1'>
      <div className="mb-4 flex items-center justify-between">
        <BackButton />
        {isAdmin && (
          <button
            onClick={handleSeedStations}
            disabled={seeding}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {seeding ? 'Seeding...' : '🌱 Seed Sample Stations'}
          </button>
        )}
      </div>
      <Title 
        title='EV Charging Stations' 
        subTitle='Find nearby electric vehicle charging points across India' 
      />
      
      {locationError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          📍 Location access denied. Showing default location. Enable location for better results.
        </div>
      )}
      
      <div className="mt-6">
        {userLocation ? (
          <InteractiveChargingMap userLocation={userLocation} />
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChargingStations
