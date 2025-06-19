const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const User = require('./models/User');
const Office = require('./models/Office');
const BusinessUnit = require('./models/BusinessUnit');
const SuperAdmin = require('./models/superAdmin');

dotenv.config();

const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, { dbName: 'CRM' })
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to ABBASS CRM API' });
});

// Test database connection route
app.get('/api/test-db', async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const collections = await mongoose.connection.db.listCollections().toArray();
            res.json({
                message: 'MongoDB connection successful',
                status: 'connected',
                database: mongoose.connection.name,
                collections: collections.map(c => c.name)
            });
        } else {
            res.status(500).json({
                error: 'MongoDB not connected',
                status: mongoose.connection.readyState
            });
        }
    } catch (error) {
        res.status(500).json({
            error: 'Database connection failed',
            details: error.message
        });
    }
});

// ----------- USER CREATION (ALL ROLES) -----------
app.post('/api/users', async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, businessUnit, office } = req.body;
        if (!firstName || !lastName || !email || !password || !businessUnit || !office || !role) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Check for duplicate email in the correct collection
        let existing;
        if (role === 'admin') {
            existing = await Admin.findOne({ email });
        } else if (role === 'super_admin') {
            existing = await SuperAdmin.findOne({ email });
        } else {
            existing = await User.findOne({ email });
        }
        if (existing) {
            return res.status(400).json({ success: false, error: 'User with this email already exists' });
        }

        // Store in the correct collection
        let newUser;
        if (role === 'admin') {
            newUser = new Admin({ firstName, lastName, email, password, role, businessUnit, office });
            await newUser.save();
        } else if (role === 'super_admin') {
            newUser = new SuperAdmin({ firstName, lastName, email, password, role, businessUnit, office });
            await newUser.save();
        } else {
            newUser = new User({ firstName, lastName, email, password, role, businessUnit, office });
            await newUser.save();
        }

        res.status(201).json({ success: true, message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// Add this right after your other user routes (like /api/users/:id)
app.put('/api/super-admin/:id', async (req, res) => {
    try {
        const { firstName, lastName, email, role, businessUnit, office } = req.body;
        
        // Check if email is being changed and if it's already in use
        if (email) {
            const existingUser = await SuperAdmin.findOne({ 
                email, 
                _id: { $ne: req.params.id } 
            });
            if (existingUser) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Email already in use by another user' 
                });
            }
        }

        // Update the super admin
        const updatedUser = await SuperAdmin.findByIdAndUpdate(
            req.params.id,
            { 
                firstName, 
                lastName, 
                email, 
                role, 
                businessUnit, 
                office 
            },
            { 
                new: true, 
                select: '-password' 
            }
        );

        if (!updatedUser) {
            return res.status(404).json({ 
                success: false, 
                error: 'Super admin not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Super admin updated successfully', 
            data: updatedUser 
        });
    } catch (error) {
        console.error('Error updating super admin:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}); 

// ----------- LOGIN (ALL ROLES) -----------
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user;

        // Try to find user in each collection
        user = await SuperAdmin.findOne({ email });
        if (!user) {
            user = await Admin.findOne({ email });
        }
        if (!user) {
            user = await User.findOne({ email });
        }

        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // --- Ensure businessUnit is always a string name ---
        let businessUnitName = user.businessUnit;
        // If businessUnit is an object (e.g., { name: "Business Brokers" }), get the name
        if (businessUnitName && businessUnitName.name) {
            businessUnitName = businessUnitName.name;
        }

        // If businessUnit is an ObjectId, look up the name from BusinessUnit collection
        if (
            businessUnitName &&
            typeof businessUnitName === 'string' &&
            businessUnitName.match(/^[0-9a-fA-F]{24}$/)
        ) {
            const buDoc = await BusinessUnit.findById(businessUnitName);
            if (buDoc && buDoc.name) {
                businessUnitName = buDoc.name;
            }
        }

        // --- Same for office, if you want ---
        let officeName = user.office;
        if (officeName && officeName.name) {
            officeName = officeName.name;
        }
        if (
            officeName &&
            typeof officeName === 'string' &&
            officeName.match(/^[0-9a-fA-F]{24}$/)
        ) {
            const officeDoc = await Office.findById(officeName);
            if (officeDoc && officeDoc.name) {
                officeName = officeDoc.name;
            }
        }

        // Format response to match frontend expectations
        res.json({
            success: true,
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            businessUnits: [businessUnitName],
            office: officeName
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ----------- ADMIN ROUTES -----------
app.get('/api/admin', async (req, res) => {
    try {
        const admins = await Admin.find({}, { password: 0 });
        res.json({ success: true, data: admins });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ----------- USERS ROUTES -----------
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id, { password: 0 });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { firstName, lastName, email, role, businessUnit, office } = req.body;
        const userId = req.params.id;
        
        // Check if email is being changed and if it's already in use
        if (email) {
            const existingUser = await User.findOne({ 
                email, 
                _id: { $ne: userId } 
            });
            if (existingUser) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Email already in use by another user' 
                });
            }
        }

        // Find the user in any collection
        let currentUser = await User.findById(userId);
        let currentCollection = 'User';
        
        if (!currentUser) {
            currentUser = await Admin.findById(userId);
            currentCollection = 'Admin';
        }
        
        if (!currentUser) {
            currentUser = await SuperAdmin.findById(userId);
            currentCollection = 'SuperAdmin';
        }

        if (!currentUser) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found',
                details: `No user found with ID: ${userId}`
            });
        }

        // If role is changing, handle the migration
        if (role && role !== currentUser.role) {
            // Delete from current collection
            if (currentCollection === 'User') {
                await User.findByIdAndDelete(userId);
            } else if (currentCollection === 'Admin') {
                await Admin.findByIdAndDelete(userId);
            } else if (currentCollection === 'SuperAdmin') {
                await SuperAdmin.findByIdAndDelete(userId);
            }

            // Create in new collection
            let newUser;
            const userData = {
                firstName,
                lastName,
                email,
                password: currentUser.password, // Preserve the password
                role,
                businessUnit,
                office
            };

            if (role === 'admin') {
                newUser = new Admin(userData);
            } else if (role === 'super_admin') {
                newUser = new SuperAdmin(userData);
            } else if (role === 'manager') {
                newUser = new User(userData);
            } else {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role specified',
                    details: 'Role must be one of: manager, admin, super_admin'
                });
            }

            await newUser.save();
            currentUser = newUser;
        } else {
            // If role is not changing, just update in current collection
            const updateData = { firstName, lastName, email, businessUnit, office };
            
            if (currentCollection === 'User') {
                currentUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
            } else if (currentCollection === 'Admin') {
                currentUser = await Admin.findByIdAndUpdate(userId, updateData, { new: true });
            } else if (currentCollection === 'SuperAdmin') {
                currentUser = await SuperAdmin.findByIdAndUpdate(userId, updateData, { new: true });
            }
        }

        // Format the response
        const response = {
            success: true,
            message: 'User updated successfully',
            data: {
                id: currentUser._id,
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
                email: currentUser.email,
                role: currentUser.role,
                businessUnit: currentUser.businessUnit,
                office: currentUser.office
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error updating user',
            details: error.message 
        });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        let deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            deletedUser = await Admin.findByIdAndDelete(req.params.id);
        }
        if (!deletedUser) {
            deletedUser = await SuperAdmin.findByIdAndDelete(req.params.id);
        }
        if (!deletedUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});



// Get all users (including admins and super_admins)
app.get('/api/all-users', async (req, res) => {
    try {
      // Fetch users from all collections
      const users = await User.find();
      const admins = await Admin.find();
      const superAdmins = await SuperAdmin.find();
  
      // Combine all users and add role if not present
      const allUsers = [
        ...users.map(u => ({ ...u.toObject(), role: u.role || 'manager' })),
        ...admins.map(a => ({ ...a.toObject(), role: a.role || 'admin' })),
        ...superAdmins.map(s => ({ ...s.toObject(), role: s.role || 'super_admin' }))
      ];
  
      res.json({ 
        success: true, 
        data: allUsers 
      });
    } catch (error) {
      console.error('Error fetching all users:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch users' 
      });
    }
  });
  

// ----------- BUSINESS UNITS ROUTES -----------
app.get('/api/business-units', async (req, res) => {
    try {
        const units = await BusinessUnit.find();
        res.json({ success: true, data: units });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/business-units', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
        const unit = new BusinessUnit({ name });
        await unit.save();
        res.status(201).json({ success: true, data: unit });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/business-units/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await BusinessUnit.findByIdAndDelete(id);
        if (!result) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ----------- OFFICES ROUTES -----------
app.get('/api/offices', async (req, res) => {
    try {
        const offices = await Office.find();
        res.json({ success: true, data: offices });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/offices', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
        const office = new Office({ name });
        await office.save();
        res.status(201).json({ success: true, data: office });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/offices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Office.findByIdAndDelete(id);
        if (!result) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ----------- DEALS ROUTES -----------
const Deal = require('./models/Deals');

// Middleware to check user role and permissions
const checkDealPermissions = async (req, res, next) => {
    try {
        console.log('Checking deal permissions');
        console.log('Request user:', req.user);
        
        const userRole = req.user.role;
        const userBusinessUnits = req.user.businessUnits;
        const userOffice = req.user.office;

        console.log('User role:', userRole);
        console.log('User business units:', userBusinessUnits);
        console.log('User office:', userOffice);

        // Super admin and admin have full access
        if (userRole === 'super_admin' || userRole === 'admin') {
            return next();
        }

        // For managers, check business unit and office access
        if (userRole === 'manager') {
            req.dealPermissions = {
                canViewAll: false,
                businessUnits: userBusinessUnits,
                office: userOffice
            };
        }

        next();
    } catch (error) {
        console.error('Error in checkDealPermissions:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error checking permissions',
            details: error.message,
            stack: error.stack
        });
    }
};

// Get all deals with role-based filtering
app.get('/api/deals', checkDealPermissions, async (req, res) => {
    try {
        console.log('Deals request received');
        console.log('User:', req.user);
        console.log('Query params:', req.query);
        
        const { businessUnit, businessUnits, office } = req.query;
        let query = {};

        // Get user role and permissions
        const userRole = req.user.role;
        const userBusinessUnits = req.user.businessUnits;
        const userOffice = req.user.office;

        console.log('User role:', userRole);
        console.log('User business units:', userBusinessUnits);
        console.log('User office:', userOffice);

        if (userRole === 'manager') {
            // For managers, only show deals from their business unit
            query.businessUnit = { $in: userBusinessUnits };
        } else if (businessUnits) {
            // For super_admin and admin, accept business unit filter
            query.businessUnit = { $in: businessUnits.split(',') };
        } else if (businessUnit) {
            query.businessUnit = businessUnit;
        }

        if (office) {
            query.office = office;
        }

        console.log('Final query:', query);
        const deals = await Deal.find(query);
        console.log('Deals found:', deals.length);
        
        res.json({ success: true, data: deals });
    } catch (error) {
        console.error('Error in /api/deals:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error fetching deals', 
            details: error.message,
            stack: error.stack 
        });
    }
});

// Create new deal
app.post('/api/deals', checkDealPermissions, async (req, res) => {
    try {
        const { name, stage, owner, businessUnit, office } = req.body;
        
        // Get user role and permissions
        const userRole = req.user.role;
        const userBusinessUnits = req.user.businessUnits;
        const userOffice = req.user.office;

        // Validate required fields
        if (!name || !stage || !owner || !businessUnit || !office) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Role-based validation
        if (userRole === 'manager') {
            // Managers can only create deals for their business unit and office
            if (!userBusinessUnits.includes(businessUnit)) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'You can only create deals for your business unit' 
                });
            }
            if (office !== userOffice) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'You can only create deals for your office location' 
                });
            }
        }

        const deal = new Deal({ name, stage, owner, businessUnit, office });
        await deal.save();
        res.status(201).json({ success: true, message: 'Deal created', data: deal });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error creating deal', details: error.message });
    }
});

// Update deal
app.put('/api/deals/:id', checkDealPermissions, async (req, res) => {
    try {
        const { name, stage, owner, businessUnit, office } = req.body;
        
        // Get user role and permissions
        const userRole = req.user.role;
        const userOffice = req.user.office;
        const userBusinessUnits = req.user.businessUnits;

        // Find the deal first
        const deal = await Deal.findById(req.params.id);
        if (!deal) {
            return res.status(404).json({ success: false, error: 'Deal not found' });
        }

        // Role-based validation
        if (userRole === 'manager') {
            // Managers can only update deals from their office
            if (deal.office !== userOffice) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'You can only update deals from your office location' 
                });
            }
            // Managers can't change the business unit
            if (businessUnit && businessUnit !== deal.businessUnit) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'You cannot change the business unit of a deal' 
                });
            }
            // Managers can't change the office
            if (office && office !== deal.office) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'You cannot change the office of a deal' 
                });
            }
        }

        const updatedDeal = await Deal.findByIdAndUpdate(
            req.params.id,
            { name, stage, owner, businessUnit, office },
            { new: true }
        );

        res.json({ success: true, message: 'Deal updated', data: updatedDeal });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error updating deal', details: error.message });
    }
});

// Delete deal
app.delete('/api/deals/:id', checkDealPermissions, async (req, res) => {
    try {
        const userRole = req.user.role;
        const userOffice = req.user.office;

        // Find the deal first
        const deal = await Deal.findById(req.params.id);
        if (!deal) {
            return res.status(404).json({ success: false, error: 'Deal not found' });
        }

        // Role-based validation
        if (userRole === 'manager') {
            // Managers can only delete deals from their office
            if (deal.office !== userOffice) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'You can only delete deals from your office location' 
                });
            }
        }

        const deletedDeal = await Deal.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deal deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error deleting deal', details: error.message });
    }
});


// Add this to your backend (e.g., server.js or routes file)
app.post('/api/forgot-password', async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required.' });
    }
  
    try {
      // Try to find the user in all collections
      let user = await User.findOne({ email });
      let userType = 'user';
      if (!user) {
        user = await Admin.findOne({ email });
        userType = 'admin';
      }
      if (!user) {
        user = await SuperAdmin.findOne({ email });
        userType = 'super_admin';
      }
      if (!user) {
        return res.status(404).json({ success: false, message: 'Email not found.' });
      }
  
      // Update the password
      user.password = newPassword;
      await user.save();
  
      return res.json({ success: true, message: `Password updated for ${userType}.` });
    } catch (error) {
      console.error('Error in forgot-password:', error);
      return res.status(500).json({ success: false, message: 'Server error.' });
    }
  });

// ----------- START SERVER -----------
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});