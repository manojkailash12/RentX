import React, { useEffect } from 'react'
import NavbarOwner from '../../components/owner/NavbarOwner'
import Sidebar from '../../components/owner/Sidebar'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'

const Layout = () => {
  const {user, navigate} = useAppContext()

  useEffect(()=>{
    // Allow access if user is logged in (any role can access enterprise features)
    if(!user){
      navigate('/')
    }
  },[user])
  
  return (
    <div className='h-screen flex flex-col overflow-hidden'>
        <NavbarOwner />
        <div className='flex flex-1 overflow-hidden'>
            <Sidebar />
            <div className='flex-1 overflow-auto'>
                <Outlet />
            </div>
        </div>
    </div>
  )
}

export default Layout