import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/v1')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: any) {
    return this.authService.registerUser(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @Post('biometric-enroll')
  @HttpCode(HttpStatus.OK)
  async enrollDevice(@Body() body: { userId: string; publicKey: string }) {
    return this.authService.registerBiometrics(body.userId, body.publicKey);
  }

  @Post('biometric-login')
  @HttpCode(HttpStatus.OK)
  async biometricLogin(@Body() body: { userId: string; challenge: string; signature: string }) {
    return this.authService.loginWithBiometrics(body.userId, body.challenge, body.signature);
  }
}