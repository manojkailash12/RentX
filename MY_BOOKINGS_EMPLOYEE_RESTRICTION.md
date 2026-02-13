# My Bookings Page - Employee Role Restriction

## Changes Made

### 1. Route Protection in App.jsx
- Added `ProtectedMyBookings` component that checks user role
- Admin and Employee users are blocked from accessing `/my-bookings` route
- Shows "Access Denied" message with redirect to home page
- Regular users can access the page normally

### 2. Navigation Menu (Navbar.jsx)
- Already had logic to hide "My Bookings" link from dropdown menu for admin and employee roles
- Only regular users see the "Bookings" option in the profile dropdown

### 3. Sidebar (Sidebar.jsx)
- Already had logic to hide "My Bookings" link from sidebar for admin and employee roles
- Only regular users see "My Bookings" in the owner dashboard sidebar

## Implementation Details

### Protected Route Component
```javascript
const ProtectedMyBookings = () => {
  if (isAdmin || isEmployee) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">This page is not available for {isAdmin ? 'admin' : 'employee'} accounts</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dull transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }
  return <MyBookings />;
};
```

### Route Configuration
```javascript
<Route path="/my-bookings" element={<ProtectedMyBookings />} />
```

## Access Control Summary

| User Role | Can Access My Bookings | Can See Link in Menu |
|-----------|------------------------|---------------------|
| Regular User | ✅ Yes | ✅ Yes |
| Employee | ❌ No | ❌ No |
| Admin | ❌ No | ❌ No |

## Testing Checklist
- [x] Regular users can access `/my-bookings` page
- [x] Regular users see "My Bookings" link in navbar dropdown
- [x] Regular users see "My Bookings" link in sidebar
- [x] Employee users cannot access `/my-bookings` (shows Access Denied)
- [x] Employee users don't see "My Bookings" link in navbar dropdown
- [x] Employee users don't see "My Bookings" link in sidebar
- [x] Admin users can