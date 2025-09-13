import { Controller, Post, Req, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';

@ApiTags('sso_client')
@Controller('sso_client')
export class SsoClientController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('user_details_from_cookie')
  @ApiOperation({ summary: 'Validate EduGorilla SSO cookie and return user details' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User authenticated successfully',
    schema: {
      example: {
        status: true,
        msg: 'User authenticated successfully',
        user_info: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '1234567890',
          picture: 'https://example.com/avatar.jpg',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid authentication token',
  })
  async validateEduGorillaCookie(@Req() request: Request) {
    try {
      // Get the cookie from the request
      const token = request.cookies['eg_user'];

      if (!token) {
        return {
          status: false,
          msg: 'No authentication cookie found',
        };
      }

      // Validate the token using JwtService
      try {
        const decoded = this.jwtService.verify(token);

        if (!decoded || !decoded.sub) {
          return {
            status: false,
            msg: 'Invalid authentication token',
          };
        }

        // Get user details from the database using the user ID from the token
        const user = await this.usersService.findOne(decoded.sub, true);

        if (!user) {
          return {
            status: false,
            msg: 'User not found',
          };
        }

        // Return the user data in the format EduGorilla expects
        return {
          status: true,
          msg: 'User authenticated successfully',
          user_info: {
            name: user.full_name,
            email: user.email,
            phone: user.phone || '',
            picture: user.imageUrl || '',
          },
        };
      } catch (error) {
        console.error('Token verification error:', error);
        return {
          status: false,
          msg: 'Authentication error',
        };
      }
    } catch (error) {
      console.error('Cookie validation error:', error);
      return {
        status: false,
        msg: 'Internal server error',
      };
    }
  }
}
