import React, { useState } from 'react'
import { assets, ownerMenuLinks } from '../../assets/assets'
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const Sidebar = () => {
    const { t } = useTranslation();
    const {user, axios, fetchUser, isAdmin, isEmployee, logout} = useAppContext();
    const location = useLocation();
    const [image, setImage] = useState('')

    const updateImage = async ()=> {
        try {
            const formData = new FormData()
            formData.append('image', image)

            const {data} = await axios.post('/owner/update-image', formData)

            if(data.success) {
                fetchUser()
                toast.success(data.message)
                setImage('')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // Get user's initials for avatar
    const getUserInitials = () => {
        if (!user?.name) return 'U';
        const names = user.name.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return names[0][0].toUpperCase();
    };

    // Get menu links based on user role with translations
    const getMenuLinks = () => {
        let menuLinks = [
            { name: t('sidebar.dashboard'), path: "/owner", icon: assets.dashboardIcon, coloredIcon: assets.dashboardIconColored }
        ];
        
        // Add employee-specific car management options
        if (isEmployee) {
            menuLinks.push(
                { 
                    name: 'Add Admin Car', 
                    path: "/owner/add-admin-car", 
                    icon: assets.addIcon, 
                    coloredIcon: assets.addIconColored 
                },
                { 
                    name: 'Add My Car', 
                    path: "/owner/add-own-car", 
                    icon: assets.addIcon, 
                    coloredIcon: assets.addIconColored 
                }
            );
        } else if (!isAdmin) {
            // Regular users (non-employee, non-admin) see single Add Car option
            menuLinks.push({ 
                name: t('sidebar.addCar'), 
                path: "/owner/add-car", 
                icon: assets.addIcon, 
                coloredIcon: assets.addIconColored 
            });
        }
        
        // Add common menu items
        // Hide "My Bookings" for admin and employee roles
        if (!isAdmin && !isEmployee) {
            menuLinks.push({ 
                name: t('sidebar.myBookings'), 
                path: "/my-bookings", 
                icon: assets.calendar_icon_colored, 
                coloredIcon: assets.calendar_icon_colored 
            });
        }
        
        menuLinks.push({ 
            name: t('sidebar.manageCars'), 
            path: "/owner/manage-cars", 
            icon: assets.carIcon, 
            coloredIcon: assets.carIconColored 
        });
        
        // Hide "Manage Bookings" for admin role - employees handle this
        if (!isAdmin) {
            menuLinks.push({ 
                name: t('sidebar.manageBookings'), 
                path: "/owner/manage-bookings", 
                icon: assets.listIcon, 
                coloredIcon: assets.listIconColored 
            });
        }
        
        // Add advanced features for regular users (non-admin, non-employee)
        if (!isAdmin && !isEmployee) {
            menuLinks.push({
                name: 'Predictive Maintenance',
                path: "/owner/predictive-maintenance",
                icon: assets.carIcon,
                coloredIcon: assets.carIconColored
            });
            menuLinks.push({
                name: 'EV Charging Stations',
                path: "/owner/charging-stations",
                icon: assets.carIcon,
                coloredIcon: assets.carIconColored
            });
            menuLinks.push({
                name: 'Smart Contracts',
                path: "/owner/smart-contracts",
                icon: assets.carIcon,
                coloredIcon: assets.carIconColored
            });
        }
        
        // Add employee-specific menu items
        if (isEmployee) {
            menuLinks.push({
                name: t('sidebar.carApprovals'), 
                path: "/owner/car-approvals", 
                icon: assets.cautionIconColored, 
                coloredIcon: assets.cautionIconColored 
            });
            menuLinks.push({
                name: 'Attendance',
                path: "/employee/attendance",
                icon: assets.calendar_icon_colored,
                coloredIcon: assets.calendar_icon_colored
            });
            menuLinks.push({
                name: 'Biometric Enrollment',
                path: "/employee/biometric-enrollment",
                icon: assets.users_icon,
                coloredIcon: assets.users_icon
            });
            menuLinks.push({
                name: 'Leave Management',
                path: "/employee/leave-management",
                icon: assets.listIconColored,
                coloredIcon: assets.listIconColored
            });
            menuLinks.push({
                name: 'Payroll',
                path: "/employee/payroll",
                icon: assets.listIconColored,
                coloredIcon: assets.listIconColored
            });
            menuLinks.push({
                name: 'Account Deletion',
                path: "/employee/account-deletion",
                icon: assets.users_icon,
                coloredIcon: assets.users_icon
            });
            menuLinks.push({
                name: 'Reviews', 
                path: "/owner/reviews", 
                icon: assets.listIconColored, 
                coloredIcon: assets.listIconColored 
            });
            menuLinks.push({
                name: 'Support Tickets',
                path: "/owner/support-tickets",
                icon: assets.listIconColored,
                coloredIcon: assets.listIconColored
            });
            menuLinks.push({
                name: 'Chat Support',
                path: "/owner/admin-chat",
                icon: assets.listIconColored,
                coloredIcon: assets.listIconColored
            });
            menuLinks.push({
                name: 'Users',
                path: "/owner/users",
                icon: assets.users_icon,
                coloredIcon: assets.users_icon
            });
            menuLinks.push({
                name: 'Deleted Accounts',
                path: "/owner/deleted-accounts",
                icon: assets.users_icon,
                coloredIcon: assets.users_icon
            });
        }
        
        // Add admin-specific menu items
        if (isAdmin) {
            menuLinks.push({
                name: 'Employee Car Approvals',
                path: "/owner/admin-car-approvals",
                icon: assets.cautionIconColored,
                coloredIcon: assets.cautionIconColored
            });
            menuLinks.push({
                name: 'Employees',
                path: "/owner/employees",
                icon: assets.users_icon,
                coloredIcon: assets.users_icon
            });
            menuLinks.push({
                name: 'Employee Deletion Requests',
                path: "/owner/employee-deletion-requests",
                icon: assets.users_icon,
                coloredIcon: assets.users_icon
            });
            menuLinks.push({
                name: 'Biometric Devices',
                path: "/owner/biometric-devices",
                icon: assets.users_icon,
                coloredIcon: assets.users_icon
            });
            menuLinks.push({
                name: 'Shift Scheduling',
                path: "/owner/shift-scheduling",
                icon: assets.calendar_icon_colored,
                coloredIcon: assets.calendar_icon_colored
            });
            menuLinks.push({
                name: 'Performance Reviews',
                path: "/owner/performance-reviews",
                icon: assets.listIconColored,
                coloredIcon: assets.listIconColored
            });
            menuLinks.push({
                name: 'Training Management',
                path: "/owner/training-management",
                icon: assets.listIconColored,
                coloredIcon: assets.listIconColored
            });
            menuLinks.push({
                name: 'Dynamic Pricing',
                path: "/owner/dynamic-pricing",
                icon: assets.listIconColored,
                coloredIcon: assets.listIconColored
            });
            menuLinks.push({
                name: 'Leave Approval',
                path: "/owner/leave-approval",
                icon: assets.listIconColored,
                coloredIcon: assets.listIconColored
            });
        }
        
        return menuLinks;
    }

  return (
    <div className='h-full flex flex-col items-center pt-6 w-16 md:w-60 border-r border-borderColor text-sm bg-white overflow-y-auto'>
        <div className='group relative mb-4'>
            <label htmlFor="image">
                <div className='h-12 md:h-16 w-12 md:w-16 rounded-full mx-auto bg-primary text-white flex items-center justify-center text-lg font-medium cursor-pointer relative overflow-hidden'>
                    {image ? (
                        <img src={URL.createObjectURL(image)} alt="" className='h-full w-full object-cover'/>
                    ) : user?.image ? (
                        <img src={user.image} alt="" className='h-full w-full object-cover'/>
                    ) : (
                        getUserInitials()
                    )}
                </div>
                <input type="file" id="image" accept='image/*' hidden onChange={(e)=> setImage(e.target.files[0])}/>

                <div className='absolute hidden top-0 right-0 left-0 bottom-0 bg-black/10 rounded-full group-hover:flex items-center justify-center cursor-pointer'>
                    <img src={assets.edit_icon} alt="" className='w-4 h-4'/>
                </div>
            </label>

        </div>
        {image && (
            <button onClick={updateImage} className='mb-4 flex p-2 gap-1 bg-primary/10 text-primary cursor-pointer rounded text-xs'>
                {t('sidebar.save')} <img src={assets.check_icon} width={13} alt=""/>
            </button>
        )}
        <div className='text-center max-md:hidden mb-6'>
            <p className='text-sm font-medium'>{user?.name || 'User'}</p>
            <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                isAdmin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
                {isAdmin ? t('nav.admin') : t('nav.user')}
            </span>
        </div>

        <div className='w-full flex-1'>
            {getMenuLinks().map((link, index)=> (
                <NavLink key={index} to={link.path} className={`relative flex items-center gap-3 w-full py-3 px-4 hover:bg-gray-50 transition-colors ${link.path === location.pathname ? "bg-primary/10 text-primary" : 'text-gray-600'}`}>
                    <img src={link.path === location.pathname ? link.coloredIcon : link.icon} alt="menu icon" className='w-5 h-5' />
                    <span className='max-md:hidden'>{link.name}</span>
                    <div className={`${link.path === location.pathname && 'bg-primary'} w-1 h-8 rounded-l right-0 absolute`}></div>
                </NavLink>
            ))}

            {/* Back to Home Link */}
            <Link to='/' className='relative flex items-center gap-3 w-full py-3 px-4 mt-4 hover:bg-gray-50 transition-colors text-gray-600 border-t border-gray-200'>
                <img src={assets.arrow_icon} alt="back icon" className='rotate-180 w-5 h-5' />
                <span className='max-md:hidden'>{t('sidebar.backToHome')}</span>
            </Link>
        </div>
    </div>
  )
}

export default Sidebar