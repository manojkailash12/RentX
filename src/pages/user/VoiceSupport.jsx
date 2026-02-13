import React from 'react'
import BackButton from '../../components/BackButton'
import Title from '../../components/owner/Title'

const VoiceSupport = () => {
  return (
    <div className='px-4 pt-10 md:px-10 flex-1'>
      <div className="mb-4">
        <BackButton />
      </div>
      <Title 
        title='Voice Support' 
        subTitle='AI-powered voice customer support' 
      />
      
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <span className="text-6xl">🎧</span>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-center">Voice-Based Support</h2>
          <p className="text-gray-600 mb-6 text-center">
            Get instant help with our AI-powered voice support system. Speak naturally
            and get answers to your questions in real-time.
          </p>
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="font-semibold">AI-Powered</h3>
                <p className="text-sm text-gray-600">
                  Natural language understanding for accurate responses
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-semibold">Instant Responses</h3>
                <p className="text-sm text-gray-600">
                  Get help immediately without waiting in queue
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌍</span>
              <div>
                <h3 className="font-semibold">Multi-Language</h3>
                <p className="text-sm text-gray-600">
                  Support available in multiple languages
                </p>
              </div>
            </div>
          </div>
          <button
            className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold transition-colors"
          >
            Try Voice Support Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default VoiceSupport
