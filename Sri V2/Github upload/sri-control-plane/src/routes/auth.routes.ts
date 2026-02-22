import { FastifyInstance } from 'fastify';
import authService from '../services/auth.service';

export default async function authRoutes(fastify: FastifyInstance) {
    // REGISTER
    fastify.post('/register', async (req: any, reply) => {
        const { name, email, username, company, phone, zones, password } = req.body;

        try {
            // Check if user exists
            const existingUser = await authService.findUserByEmail(email);
            if (existingUser) {
                return reply.code(400).send({ message: 'User already exists' });
            }

            // Hash password
            const password_hash = await authService.hashPassword(password);

            // Create user
            const user = await authService.registerUser({
                email,
                password_hash,
                name,
                username,
                company,
                phone
            }, zones);

            // Generate token
            const token = fastify.jwt.sign({
                id: (user as any).id,
                email: (user as any).email,
                role: (user as any).role
            });

            return { token, user };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ message: error.message || 'Registration failed' });
        }
    });

    // LOGIN
    fastify.post('/login', async (req: any, reply) => {
        const { email, password } = req.body;

        try {
            const user = await authService.findUserByEmail(email);
            if (!user) {
                return reply.code(401).send({ message: 'Invalid credentials' });
            }

            const isValid = await authService.comparePassword(password, user.password_hash);
            if (!isValid) {
                return reply.code(401).send({ message: 'Invalid credentials' });
            }

            // Generate token
            const token = fastify.jwt.sign({
                id: user.id,
                email: user.email,
                role: user.role
            });

            // Don't send hash back
            delete user.password_hash;

            return { token, user };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ message: error.message || 'Login failed' });
        }
    });

    // HEALTH CHECK (Auth restricted example)
    fastify.get('/me', {
        onRequest: [fastify.authenticate]
    }, async (req: any) => {
        const user = await authService.findUserByEmail(req.user.email);
        delete user.password_hash;

        const zones = await authService.getZonesByUserId(user.id);
        user.zones = zones;

        return user;
    });
}
