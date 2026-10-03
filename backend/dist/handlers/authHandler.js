"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthHandler = void 0;
const dynamoService_1 = require("../services/dynamoService");
exports.AuthHandler = {
    async signup(req, res) {
        try {
            const { fullName, email, password, confirmPassword, academicLevel, institution } = req.body;
            if (!fullName || !email || !password) {
                return res.status(400).json({ error: 'Full name, email, and password are required.' });
            }
            if (password !== confirmPassword) {
                return res.status(400).json({ error: 'Passwords do not match.' });
            }
            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
            }
            // Check if user already exists
            const existingUser = await dynamoService_1.DynamoService.getItem(`USER#${email.toLowerCase()}`, 'METADATA');
            if (existingUser) {
                return res.status(409).json({ error: 'An account with this email already exists.' });
            }
            const userId = `user_${Date.now()}`;
            const now = new Date().toISOString();
            const tenantId = `tenant_${Date.now()}`;
            // 1. Create User profile
            const userProfile = {
                userId,
                email: email.toLowerCase(),
                name: fullName,
                academicLevel: academicLevel || 'Undergraduate',
                institution: institution || 'State University',
                createdAt: now,
                updatedAt: now,
            };
            await dynamoService_1.DynamoService.putItem({
                PK: `USER#${email.toLowerCase()}`,
                SK: 'METADATA',
                type: 'user',
                ...userProfile,
                passwordHash: 'DEMO_HASH_' + Buffer.from(password).toString('base64'),
            });
            // Also store by userId for quick lookup
            await dynamoService_1.DynamoService.putItem({
                PK: `USER#${userId}`,
                SK: 'METADATA',
                type: 'user',
                ...userProfile,
            });
            // 2. Create Default Individual Tenant
            const tenant = {
                tenantId,
                tenantName: `${fullName.split(' ')[0]}'s Study Space`,
                tenantType: 'individual',
                ownerId: userId,
                ownerEmail: email.toLowerCase(),
                members: [
                    {
                        userId,
                        email: email.toLowerCase(),
                        name: fullName,
                        role: 'owner',
                        joinedAt: now,
                    },
                ],
                createdAt: now,
                updatedAt: now,
            };
            await dynamoService_1.DynamoService.putItem({
                PK: `TENANT#${tenantId}`,
                SK: 'METADATA',
                type: 'tenant',
                ...tenant,
            });
            // 3. Map user to tenant in GSI1
            await dynamoService_1.DynamoService.putItem({
                PK: `USER#${userId}`,
                SK: `TENANT#${tenantId}`,
                GSI1PK: `USER#${userId}`,
                GSI1SK: `TENANT#${tenantId}`,
                type: 'user_tenant_membership',
                userId,
                tenantId,
                tenantName: tenant.tenantName,
                role: 'owner',
            });
            // Generate simulated JWT token containing user attributes
            const token = Buffer.from(JSON.stringify({
                sub: userId,
                userId,
                email: email.toLowerCase(),
                name: fullName,
                tenantId,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400 * 7,
            })).toString('base64');
            return res.status(201).json({
                message: 'Account created successfully',
                token,
                user: userProfile,
                activeTenant: tenant,
                tenants: [tenant],
            });
        }
        catch (error) {
            console.error('Signup error:', error);
            return res.status(500).json({ error: error.message || 'Internal server error during registration' });
        }
    },
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required.' });
            }
            // Check user record
            const userItem = await dynamoService_1.DynamoService.getItem(`USER#${email.toLowerCase()}`, 'METADATA');
            let user;
            if (!userItem) {
                // If demo user login (e.g. Ahmad)
                if (email.toLowerCase() === 'ahmad@example.com') {
                    user = {
                        userId: 'user_ahmad_001',
                        email: 'ahmad@example.com',
                        name: 'Ahmad Khan',
                        academicLevel: 'Undergraduate (Year 3)',
                        institution: 'Institute of Computer Science',
                        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                }
                else {
                    return res.status(401).json({ error: 'Invalid email or password.' });
                }
            }
            else {
                user = userItem;
            }
            // Get user's tenants
            const userTenantsMappings = await dynamoService_1.DynamoService.getUserTenants(user.userId);
            const tenants = [];
            for (const mapping of userTenantsMappings) {
                const tItem = await dynamoService_1.DynamoService.getItem(`TENANT#${mapping.tenantId}`, 'METADATA');
                if (tItem) {
                    tenants.push(tItem);
                }
            }
            // If user has no mapped tenants, load default Ahmad tenant for demo
            if (tenants.length === 0) {
                const demoT = await dynamoService_1.DynamoService.getItem('TENANT#tenant_demo_ahmad', 'METADATA');
                if (demoT)
                    tenants.push(demoT);
            }
            const activeTenant = tenants[0] || null;
            const token = Buffer.from(JSON.stringify({
                sub: user.userId,
                userId: user.userId,
                email: user.email,
                name: user.name,
                tenantId: activeTenant ? activeTenant.tenantId : '',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400 * 7,
            })).toString('base64');
            return res.status(200).json({
                message: 'Login successful',
                token,
                user,
                activeTenant,
                tenants,
            });
        }
        catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({ error: error.message || 'Internal server error during login' });
        }
    },
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }
            // Simulate Cognito forgot password confirmation code dispatch
            return res.status(200).json({
                message: `Password reset instructions sent to ${email}. Check your inbox.`,
                codeSent: true,
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    async getProfile(req, res) {
        try {
            const userId = req.user?.userId || 'user_ahmad_001';
            let profileItem = await dynamoService_1.DynamoService.getItem(`USER#${userId}`, 'METADATA');
            if (!profileItem) {
                profileItem = {
                    userId,
                    email: req.user?.email || 'ahmad@example.com',
                    name: req.user?.name || 'Ahmad Khan',
                    academicLevel: 'Undergraduate',
                    institution: 'Institute of Computer Science',
                    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
            }
            const userTenantsMappings = await dynamoService_1.DynamoService.getUserTenants(userId);
            const tenants = [];
            for (const m of userTenantsMappings) {
                const t = await dynamoService_1.DynamoService.getItem(`TENANT#${m.tenantId}`, 'METADATA');
                if (t)
                    tenants.push(t);
            }
            return res.status(200).json({
                user: profileItem,
                tenants,
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const { name, academicLevel, institution, avatarUrl } = req.body;
            const existing = await dynamoService_1.DynamoService.getItem(`USER#${userId}`, 'METADATA');
            const updated = {
                userId,
                email: req.user.email,
                name: name || existing?.name || req.user.name,
                academicLevel: academicLevel !== undefined ? academicLevel : existing?.academicLevel,
                institution: institution !== undefined ? institution : existing?.institution,
                avatarUrl: avatarUrl !== undefined ? avatarUrl : existing?.avatarUrl,
                createdAt: existing?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await dynamoService_1.DynamoService.putItem({
                PK: `USER#${userId}`,
                SK: 'METADATA',
                type: 'user',
                ...updated,
            });
            return res.status(200).json({
                message: 'Profile updated successfully',
                user: updated,
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
};
