import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './roles/schemas/role.schema';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<Role>,
  ) {}

  async onModuleInit() {
    await this.initRolesAndPermissions();
  }

  private async initRolesAndPermissions() {
    const rolesCount = await this.roleModel.countDocuments();
    if (rolesCount > 0) {
      return;
    }

    const roles = [
      {
        name: 'admin',
        permissions: ['all'],
      },
      {
        name: 'institute',
        permissions: ['view_courses', 'manage_courses'],
      },
      {
        name: 'student',
        permissions: ['view_courses'],
      },
    ];

    await this.roleModel.insertMany(roles);
  }

  getHello(): string {
    return 'Hello World!';
  }
}
