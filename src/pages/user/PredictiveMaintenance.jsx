import React from 'react'
import { useNavigate } from 'react-router-dom'
import MaintenanceAlerts from '../../components/Maintenance/MaintenanceAlerts'
import BackButton from '../../components/BackButton'
import Title from '../../components/owner/Title'

const PredictiveMaintenance = () => {
  const navigate = useNavigate()

  return (
    <div className='px-4 pt-10 md:px-10 flex-1'>
      <div className="mb-4">
        <BackButton />
      </div>
      <Title 
        title='Predictive Maintenance' 
        subTitle='AI-powered alerts for vehicle maintenance needs' 
      />
      
      <div className="mt-6">
        <MaintenanceAlerts />
      </div>
    </div>
  )
}

export default PredictiveMaintenance
