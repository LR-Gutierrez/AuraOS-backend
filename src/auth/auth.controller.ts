import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';

const avatarDir = join(process.cwd(), 'uploads', 'avatars');
if (!existsSync(avatarDir)) {
  mkdirSync(avatarDir, { recursive: true });
}

@Controller('api/v1')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('users/avatar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, avatarDir),
        filename: (req, file, cb) => {
          const userId = (req as any).user.userId;
          cb(null, `${userId}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.authService.uploadAvatar(req.user.userId, file);
  }

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
  async biometricLogin(
    @Body() body: { userId: string; challenge: string; signature: string },
  ) {
    return this.authService.loginWithBiometrics(
      body.userId,
      body.challenge,
      body.signature,
    );
  }
}
