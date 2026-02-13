import React from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../../components/BackButton'
import Title from '../../components/owner/Title'

const SmartContracts = () => {
  const navigate = useNavigate()

  return (
    <div className='px-4 pt-10 md:px-10 flex-1'>
      <div className="mb-4">
        <BackButton />
      </div>
      <Title 
        title='Smart Contracts' 
        subTitle='Blockchain-based rental agreements' 
      />
      
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <span className="text-6xl">📜</span>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-center">Smart Contract Rentals</h2>
          <p className="text-gray-600 mb-6 text-center">
            Blockchain-based rental agreements with automated payments and
            transparent terms enforcement.
          </p>
          <div className="space-y-4 mb-6">
            <div className="bg-emerald-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">🔗 Blockchain Security</h3>
              <p className="text-sm text-gray-600">
                Immutable contracts stored on Polygon network
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">⚡ Automated Payments</h3>
              <p className="text-sm text-gray-600">
                Smart contract handles deposits and final payments
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">📊 Milestone Tracking</h3>
              <p className="text-sm text-gray-600">
                Track rental progress with blockchain verification
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/my-bookings')}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors"
          >
            View Contracts
          </button>
        </div>
      </div>
    </div>
  )
}

export default SmartContracts
