const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const multer = require('multer');
const XLSX = require('xlsx');
const Admin = require('./models/Admin');
const User = require('./models/User');
const Office = require('./models/Office');
const BusinessUnit = require('./models/BusinessUnit');
const SuperAdmin = require('./models/SuperAdmin');
const Deal = require('./models/Deals');
const Contact = require('./models/Contact');

dotenv.config();

const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, { dbName: 'CRM' })
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.originalname.endsWith('.xlsx') ||
            file.originalname.endsWith('.xls')) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

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

// Fixed authentication middleware
const authenticateUser = async (req, res, next) => {
    try {
        console.log('=== DEBUG: Authentication Middleware ===');
        console.log('Request method:', req.method);
        console.log('Request URL:', req.url);
        console.log('All headers:', req.headers);
        
        // Extract user info from headers
        const userId = req.headers['x-user-id'];
        const userRole = req.headers['x-user-role'];
        const userBusinessUnits = req.headers['x-user-business-units'];
        const userOffice = req.headers['x-user-office'];
        const userName = req.headers['x-user-name'];

        console.log('Extracted headers:', {
            userId,
            userRole,
            userBusinessUnits,
            userOffice,
            userName
        });

        // If no authentication headers, fall back to mock user for debugging
        if (!userId || !userRole) {
            console.log('No authentication headers found, using mock user');
            req.user = {
                id: 'mock-user-id',
                name: 'Mock User',
                role: 'super_admin',
                businessUnits: ['Global Properties', 'Advocacy', 'Finance', 'Business Broker'],
                office: 'Main Office'
            };
            console.log('Mock user set:', req.user);
            return next();
        }

        // Parse business units if it's a string
        let businessUnits = [];
        if (userBusinessUnits) {
            try {
                businessUnits = JSON.parse(userBusinessUnits);
            } catch (error) {
                console.log('Error parsing business units, using fallback:', error);
                businessUnits = [userBusinessUnits]; // fallback to single unit
            }
        }

        req.user = {
            id: userId,
            name: userName || 'Unknown User',
            role: userRole,
            businessUnits: businessUnits,
            office: userOffice
        };

        console.log('Authenticated user set:', req.user);
        console.log('=====================================');
        next();
    } catch (error) {
        console.error('Error in authenticateUser:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Authentication failed',
            details: error.message
        });
    }
};

// Fixed checkDealPermissions middleware
const checkDealPermissions = async (req, res, next) => {
    try {
        console.log('=== DEBUG: checkDealPermissions ===');
        console.log('req.user:', req.user);
        
        // Check if user exists
        if (!req.user) {
            console.log('No user found in request');
            return res.status(401).json({ 
                success: false, 
                error: 'User not authenticated',
                details: 'No user information found in request'
            });
        }

        const userRole = req.user.role;
        const userBusinessUnits = req.user.businessUnits;
        const userOffice = req.user.office;

        console.log('User role:', userRole);
        console.log('User business units:', userBusinessUnits);
        console.log('User office:', userOffice);

        // Super admin and admin have full access
        if (userRole === 'super_admin' || userRole === 'admin') {
            console.log('User has full access');
            return next();
        }

        // For managers, check business unit and office access
        if (userRole === 'manager') {
            console.log('User is manager, setting permissions');
            req.dealPermissions = {
                canViewAll: false,
                businessUnits: userBusinessUnits,
                office: userOffice
            };
        }

        console.log('=====================================');
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

// SIMPLIFIED deals routes - let's remove checkDealPermissions for now to test
app.get('/api/deals', authenticateUser, async (req, res) => {
    try {
        console.log('=== DEBUG: GET /api/deals ===');
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

        console.log('MongoDB query:', query);
        
        const deals = await Deal.find(query);
        console.log('Deals found:', deals.length);
        console.log('Deals:', deals);
        
        res.json({ success: true, data: deals });
        console.log('Response sent successfully');
        console.log('============================');
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

// Create deal route - simplified without checkDealPermissions
app.post('/api/deals', authenticateUser, async (req, res) => {
    try {
        console.log('=== DEBUG: POST /api/deals ===');
        console.log('Request body:', req.body);
        console.log('User:', req.user);
        
        const { 
            name, stage, businessUnit, office, email, phone, dateCreated, 
            notes, commission, businessName, typeOfBusiness, sellingConsideration,
            lengthOfOperation, location, member, leadStatus, accountName, type,
            nextStep, leadSource, contactName, whereBased, whereToBuy, listingAgent,
            sellingAgent, agreement, agreementTerms, listingPrice, salesCommission,
            closingDate, probability, expectedRevenue, campaignSource, whenToBuy,
            comments, owner
        } = req.body;

        // Validate required fields based on Deal model
        if (!name || !stage || !businessUnit || !office) {
            console.log('Missing required fields');
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields',
                details: 'Name, stage, businessUnit, and office are required',
                received: { name, stage, businessUnit, office }
            });
        }

        // Role-based validation
        const userRole = req.user.role;
        const userBusinessUnits = req.user.businessUnits;
        const userOffice = req.user.office;

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

        // Create the deal with all fields
        const dealData = {
            name,
            stage,
            owner: owner || req.user.name,
            businessUnit,
            office,
            email,
            phone,
            dateCreated: dateCreated ? new Date(dateCreated) : new Date(),
            notes,
            commission,
            businessName,
            typeOfBusiness,
            sellingConsideration,
            lengthOfOperation,
            location,
            member,
            leadStatus,
            accountName,
            type,
            nextStep,
            leadSource,
            contactName,
            whereBased,
            whereToBuy,
            listingAgent,
            sellingAgent,
            agreement,
            agreementTerms,
            listingPrice,
            salesCommission,
            closingDate,
            probability: probability ? Number(probability) : 0,
            expectedRevenue,
            campaignSource,
            whenToBuy,
            comments
        };

        console.log('Creating deal with data:', dealData);
        
        const deal = new Deal(dealData);
        await deal.save();
        
        console.log('Deal created successfully:', deal);
        res.status(201).json({ success: true, message: 'Deal created', data: deal });
        console.log('===============================');
    } catch (error) {
        console.error('Error creating deal:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error creating deal', 
            details: error.message,
            stack: error.stack 
        });
    }
});

// Update deal route - simplified without checkDealPermissions
app.put('/api/deals/:id', authenticateUser, async (req, res) => {
    try {
        console.log('=== DEBUG: PUT /api/deals/:id ===');
        console.log('Deal ID:', req.params.id);
        console.log('Request body:', req.body);
        console.log('User:', req.user);
        
        const { 
            name, stage, businessUnit, office, email, phone, dateCreated, 
            notes, commission, businessName, typeOfBusiness, sellingConsideration,
            lengthOfOperation, location, member, leadStatus, accountName, type,
            nextStep, leadSource, contactName, whereBased, whereToBuy, listingAgent,
            sellingAgent, agreement, agreementTerms, listingPrice, salesCommission,
            closingDate, probability, expectedRevenue, campaignSource, whenToBuy,
            comments, owner
        } = req.body;

        // Find the deal first
        const deal = await Deal.findById(req.params.id);
        if (!deal) {
            console.log('Deal not found');
            return res.status(404).json({ success: false, error: 'Deal not found' });
        }

        console.log('Found deal:', deal);

        // Role-based validation
        const userRole = req.user.role;
        const userOffice = req.user.office;
        const userBusinessUnits = req.user.businessUnits;

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

        // Update the deal with all fields
        const updateData = {
            name: name !== undefined ? name : deal.name,
            stage: stage !== undefined ? stage : deal.stage,
            businessUnit: businessUnit !== undefined ? businessUnit : deal.businessUnit,
            office: office !== undefined ? office : deal.office,
            email: email !== undefined ? email : deal.email,
            phone: phone !== undefined ? phone : deal.phone,
            dateCreated: dateCreated ? new Date(dateCreated) : deal.dateCreated,
            notes: notes !== undefined ? notes : deal.notes,
            commission: commission !== undefined ? commission : deal.commission,
            businessName: businessName !== undefined ? businessName : deal.businessName,
            typeOfBusiness: typeOfBusiness !== undefined ? typeOfBusiness : deal.typeOfBusiness,
            sellingConsideration: sellingConsideration !== undefined ? sellingConsideration : deal.sellingConsideration,
            lengthOfOperation: lengthOfOperation !== undefined ? lengthOfOperation : deal.lengthOfOperation,
            location: location !== undefined ? location : deal.location,
            member: member !== undefined ? member : deal.member,
            leadStatus: leadStatus !== undefined ? leadStatus : deal.leadStatus,
            accountName: accountName !== undefined ? accountName : deal.accountName,
            type: type !== undefined ? type : deal.type,
            nextStep: nextStep !== undefined ? nextStep : deal.nextStep,
            leadSource: leadSource !== undefined ? leadSource : deal.leadSource,
            contactName: contactName !== undefined ? contactName : deal.contactName,
            whereBased: whereBased !== undefined ? whereBased : deal.whereBased,
            whereToBuy: whereToBuy !== undefined ? whereToBuy : deal.whereToBuy,
            listingAgent: listingAgent !== undefined ? listingAgent : deal.listingAgent,
            sellingAgent: sellingAgent !== undefined ? sellingAgent : deal.sellingAgent,
            agreement: agreement !== undefined ? agreement : deal.agreement,
            agreementTerms: agreementTerms !== undefined ? agreementTerms : deal.agreementTerms,
            listingPrice: listingPrice !== undefined ? listingPrice : deal.listingPrice,
            salesCommission: salesCommission !== undefined ? salesCommission : deal.salesCommission,
            closingDate: closingDate !== undefined ? closingDate : deal.closingDate,
            probability: probability !== undefined ? Number(probability) : deal.probability,
            expectedRevenue: expectedRevenue !== undefined ? expectedRevenue : deal.expectedRevenue,
            campaignSource: campaignSource !== undefined ? campaignSource : deal.campaignSource,
            whenToBuy: whenToBuy !== undefined ? whenToBuy : deal.whenToBuy,
            comments: comments !== undefined ? comments : deal.comments,
            owner: owner !== undefined ? owner : deal.owner
        };

        console.log('Updating deal with data:', updateData);

        const updatedDeal = await Deal.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        console.log('Deal updated successfully:', updatedDeal);
        res.json({ success: true, message: 'Deal updated', data: updatedDeal });
        console.log('===============================');
    } catch (error) {
        console.error('Error updating deal:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error updating deal', 
            details: error.message,
            stack: error.stack 
        });
    }
});

// Delete deal route - simplified without checkDealPermissions
app.delete('/api/deals/:id', authenticateUser, async (req, res) => {
    try {
        console.log('=== DEBUG: DELETE /api/deals/:id ===');
        console.log('Deal ID:', req.params.id);
        console.log('User:', req.user);
        
        const userRole = req.user.role;
        const userOffice = req.user.office;

        // Find the deal first
        const deal = await Deal.findById(req.params.id);
        if (!deal) {
            console.log('Deal not found');
            return res.status(404).json({ success: false, error: 'Deal not found' });
        }

        console.log('Found deal:', deal);

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
        console.log('Deal deleted successfully');
        res.json({ success: true, message: 'Deal deleted' });
        console.log('===============================');
    } catch (error) {
        console.error('Error deleting deal:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error deleting deal', 
            details: error.message,
            stack: error.stack 
        });
    }
});

// ----------- CONTACTS ROUTES -----------
app.post('/api/contacts', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            phone,
            email,
            industry,
            businessType,
            priceRange,
            location,
            city,
            contactOwner
        } = req.body;

        if (!firstName || !lastName || !phone || !email) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const newContact = new Contact({
            firstName,
            lastName,
            phone,
            email,
            industry,
            businessType,
            priceRange,
            location,
            city,
            contactOwner
        });
        await newContact.save();
        res.status(201).json({ success: true, message: 'Contact created successfully', data: newContact });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find();
        res.json({ success: true, data: contacts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get a contact by ID
app.get('/api/contacts/:id', async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    res.json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a contact by ID
app.put('/api/contacts/:id', async (req, res) => {
  try {
    const updated = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    res.json({ success: true, message: 'Contact updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a contact by ID
app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const deleted = await Contact.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export contacts to Excel
app.get('/api/contacts/export', async (req, res) => {
    try {
        const contacts = await Contact.find();
        
        // Prepare data for Excel
        const excelData = contacts.map(contact => ({
            'First Name': contact.firstName || '',
            'Last Name': contact.lastName || '',
            'Phone': contact.phone || '',
            'Email': contact.email || '',
            'Industry': contact.industry || '',
            'Business Type': contact.businessType || '',
            'Price Range': contact.priceRange || '',
            'Location': contact.location || '',
            'City': contact.city || '',
            'Contact Owner': contact.contactOwner || '',
            'Created At': contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : '',
            'Updated At': contact.updatedAt ? new Date(contact.updatedAt).toLocaleDateString() : ''
        }));

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        const columnWidths = [
            { wch: 15 }, // First Name
            { wch: 15 }, // Last Name
            { wch: 15 }, // Phone
            { wch: 25 }, // Email
            { wch: 15 }, // Industry
            { wch: 15 }, // Business Type
            { wch: 15 }, // Price Range
            { wch: 15 }, // Location
            { wch: 15 }, // City
            { wch: 15 }, // Contact Owner
            { wch: 15 }, // Created At
            { wch: 15 }  // Updated At
        ];
        worksheet['!cols'] = columnWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

        // Generate buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=contacts.xlsx');
        res.setHeader('Content-Length', excelBuffer.length);

        res.send(excelBuffer);
    } catch (error) {
        console.error('Error exporting contacts:', error);
        res.status(500).json({ success: false, error: 'Error exporting contacts' });
    }
});

// Import contacts from Excel
app.post('/api/contacts/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        // Read the Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
            return res.status(400).json({ success: false, error: 'Excel file must have at least a header row and one data row' });
        }

        // Get headers (first row)
        const headers = jsonData[0];
        
        // Map headers to field names
        const headerMapping = {
            'First Name': 'firstName',
            'Last Name': 'lastName',
            'Phone': 'phone',
            'Email': 'email',
            'Industry': 'industry',
            'Business Type': 'businessType',
            'Price Range': 'priceRange',
            'Location': 'location',
            'City': 'city',
            'Contact Owner': 'contactOwner'
        };

        // Process data rows (skip header row)
        const contactsToImport = [];
        const errors = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const contactData = {};

            // Map each column to the corresponding field
            headers.forEach((header, index) => {
                const fieldName = headerMapping[header];
                if (fieldName && row[index] !== undefined && row[index] !== '') {
                    contactData[fieldName] = String(row[index]).trim();
                }
            });

            // Validate required fields
            if (!contactData.firstName || !contactData.lastName || !contactData.phone || !contactData.email) {
                errors.push(`Row ${i + 1}: Missing required fields (First Name, Last Name, Phone, Email)`);
                errorCount++;
                continue;
            }

            // Check for duplicate email
            const existingContact = await Contact.findOne({ email: contactData.email });
            if (existingContact) {
                errors.push(`Row ${i + 1}: Email ${contactData.email} already exists`);
                errorCount++;
                continue;
            }

            contactsToImport.push(contactData);
        }

        // Import valid contacts
        if (contactsToImport.length > 0) {
            await Contact.insertMany(contactsToImport);
            successCount = contactsToImport.length;
        }

        res.json({
            success: true,
            message: `Import completed. ${successCount} contacts imported successfully, ${errorCount} errors.`,
            data: {
                imported: successCount,
                errors: errorCount,
                errorDetails: errors
            }
        });

    } catch (error) {
        console.error('Error importing contacts:', error);
        res.status(500).json({ success: false, error: 'Error importing contacts' });
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
