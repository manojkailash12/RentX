import React from 'react'
import { useAppContext } from '../../context/AppContext'
import AdminAddCar from '../admin/AdminAddCar'
import EmployeeAddCar from '../employee/EmployeeAddCar'

const AddCarRouter = () => {
  const { isAdmin } = useAppContext()
  
  return isAdmin ? <AdminAddCar /> : <EmployeeAddCar />
}

export default AddCarRouter
