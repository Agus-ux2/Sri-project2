import { KeyRotationService } from '../services/key-rotation.service';

const rotate = async () => {
    const service = new KeyRotationService();
    try {
        console.log('Rotating signing keys...');
        await service.rotateKey();
        console.log('✓ Keys rotated successfully');
        process.exit(0);
    } catch (err) {
        console.error('Failed to rotate keys', err);
        process.exit(1);
    }
};

rotate();
