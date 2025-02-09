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
    await this.initRolesAndPermissions().then(async () => {
      await this.createAdminUser(); // Create admin user after initializing roles
    });
  }

  private async initRolesAndPermissions() {
    const rolesCount = await this.roleModel.countDocuments();
    if (rolesCount > 0) {
      return;
    }

    const roles = [
      {
        name: 'Admin',
        slug: 'admin',
        permissions: [
          'view_all_analytics',
          'manage_institutes',
          'manage_students',
          'manage_courses',
          'manage_classes',
          'manage_subjects',
          'manage_packages',
          'manage_all_reports',
          'manage_tests',
          'manage_chapters',
        ],
      },
      {
        name: 'Institute',
        slug: 'institute',
        permissions: [
          'view_own_analytics',
          'manage_own_students',
          'manage_tests',
          'manage_chapters',
          'manage_studykit',
          'manage_course_reports',
          'manage_subject_reports',
          'manage_live_classes',
          'view_discussions',
          'replay_discussions',
        ],
      },
      {
        name: 'Student',
        slug: 'student',
        permissions: [
          'view_own_report',
          'view_live_classes',
          'view_studykit',
          'view_tests',
          'view_discussions',
          'create_discussions',
        ],
      },
    ];

    await this.roleModel.insertMany(roles);
  }

  private async createAdminUser() {
    const adminRole = await this.roleModel.findOne({ slug: 'admin' });

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
