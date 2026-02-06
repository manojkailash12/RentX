import React from 'react'
import { assets } from '../assets/assets'
import { motion } from 'motion/react'

const Footer = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className='px-6 md:px-16 lg:px-24 xl:px-32 mt-auto text-sm text-gray-500 bg-white'>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className='flex flex-col md:flex-row gap-2 items-center justify-between py-8 border-t border-borderColor'>
                <div className='flex items-center gap-3'>
                    <img src={assets.logo} alt="logo" className='h-6' />
                    <p>© {new Date().getFullYear()} RentX. All rights reserved.</p>
                </div>
            </motion.div>
        </motion.div>
    )
}

export default Footer