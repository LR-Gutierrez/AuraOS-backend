import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, pass: string) {
    const user = await this.usersService.findOne(email);

    if (!user) {
      throw new UnauthorizedException({
        success: false,
        errorCode: 'AUTH_INVALID_CREDENTIALS',
        message: 'El correo electrónico o la contraseña son incorrectos.',
      });
    }

    const isMatch = await bcrypt.compare(pass, user.password);

    if (!isMatch) {
      throw new UnauthorizedException({
        success: false,
        errorCode: 'AUTH_INVALID_CREDENTIALS',
        message: 'El correo electrónico o la contraseña son incorrectos.',
      });
    }

    const payload = {
      userId: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
    };

    return {
      success: true,
      message: 'Autenticación exitosa',
      data: {
        token: this.jwtService.sign(payload),
        tokenType: 'Bearer',
        expiresIn: 86400,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
      },
    };
  }

  async loginWithBiometrics(
    userId: string,
    challenge: string,
    signature: string,
  ) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.biometricPublicKey) {
      throw new UnauthorizedException({
        success: false,
        errorCode: 'BIOMETRIC_NOT_ENROLLED',
        message: 'Este dispositivo no está enrolado para acceso rápido.',
      });
    }

    try {
      // 1. SOLUCIÓN LLAVE PÚBLICA: Reconstruir el formato PEM que exige OpenSSL
      // Insertamos saltos de línea cada 64 caracteres como lo dicta la norma RFC 7468
      const formattedKey = user.biometricPublicKey.replace(/(.{64})/g, '$1\n');
      const pemKey = `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;

      // 2. Inicializar el verificador nativo
      const verifier = crypto.createVerify('SHA256');
      verifier.update(challenge);

      // 3. SOLUCIÓN SIGNATURE: Cambiamos 'hex' por 'base64' ya que la firma trae '/' y '=='
      const isValid = verifier.verify(pemKey, signature, 'base64');

      if (!isValid) {
        throw new UnauthorizedException({
          success: false,
          errorCode: 'BIOMETRIC_AUTH_FAILED',
          message: 'Verificación biométrica fallida o firma inválida.',
        });
      }

      // 4. Autenticación exitosa - Emitir credenciales AURA OS
      const payload = {
        userId: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
      };

      return {
        success: true,
        message: 'Autenticación biométrica exitosa',
        data: {
          token: this.jwtService.sign(payload),
          tokenType: 'Bearer',
          expiresIn: 86400,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
          },
        },
      };
    } catch (error) {
      console.error('¡Error crítico en la verificación criptográfica!', error);
      throw new UnauthorizedException({
        success: false,
        errorCode: 'BIOMETRIC_DECODE_ERROR',
        message: 'No se pudo decodificar la firma o la llave del dispositivo.',
      });
    }
  }

  async registerBiometrics(userId: string, publicKey: string) {
    const success = await this.usersService.updateBiometricKey(
      userId,
      publicKey,
    );
    if (!success) {
      throw new UnauthorizedException({
        success: false,
        message: 'Usuario no encontrado para enrolamiento.',
      });
    }
    return {
      success: true,
      message:
        'Dispositivo móvil enrolado exitosamente para acceso biométrico.',
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const avatarUrl = `uploads/avatars/${file.filename}`;
    const success = await this.usersService.updateAvatar(userId, avatarUrl);
    if (!success) {
      throw new BadRequestException({
        success: false,
        message: 'No se pudo actualizar el avatar.',
      });
    }
    return {
      success: true,
      data: { avatarUrl },
    };
  }

  async registerUser(data: any) {
    // Verificar si el usuario ya existe
    const existing = await this.usersService.findOne(data.email);
    if (existing) {
      throw new UnauthorizedException({ message: 'El correo ya está en uso' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const newUser = await this.usersService.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role || 'operator',
    });

    return {
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    };
  }
}
