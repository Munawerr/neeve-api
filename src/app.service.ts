import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './roles/schemas/role.schema';
import { User } from './users/schemas/user.schema'; // Import User schema
import * as bcrypt from 'bcrypt'; // Import bcrypt for password hashing

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(User.name) private userModel: Model<User>, // Inject User model
  ) {}

  async onModuleInit() {
    await this.initRolesAndPermissions();
    await this.createAdminUser(); // Create admin user after initializing roles
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

  private async createAdminUser() {
    const adminRole = await this.roleModel.findOne({ name: 'admin' });

    if (!adminRole) {
      throw new Error('Admin role not found');
    }

    const adminCount = await this.userModel.countDocuments({
      role: adminRole._id,
    });

    if (adminCount > 0) {
      return;
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = new this.userModel({
      full_name: 'Admin User',
      password: hashedPassword,
      email: 'admin@neeve.io', // Add email address
      role: adminRole._id, // Use admin role ID
      status: 'active',
    });

    await adminUser.save();
  }

  getHello(): string {
    return 'Hello World!';
  }
}
