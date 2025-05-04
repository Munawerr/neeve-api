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
    const roles = [
      {
        name: 'Admin',
        slug: 'admin',
        unlisted: true,
        permissions: [
          'view_all_analytics',
          'view_all_reports',
          'download_all_reports',
          'view_institutes',
          'edit_institutes',
          'delete_institutes',
          'view_students',
          'edit_students',
          'delete_students',
          'view_courses',
          'edit_courses',
          'delete_courses',
          'view_classes',
          'edit_classes',
          'delete_classes',
          'view_subjects',
          'edit_subjects',
          'delete_subjects',
          'view_packages',
          'edit_packages',
          'delete_packages',
          'view_tests',
          'edit_tests',
          'delete_tests',
          'download_tests',
          'edit_topics',
          'delete_topics',
          'view_discussions',
          'create_discussions',
          'replay_discussions',
          'delete_discussions',
          'view_threads',
          'create_threads',
          'edit_threads',
          'delete_threads',
          'view_notifications',
          'view_roles',
          'view_staff',
          'edit_roles',
          'edit_staff',
          'delete_roles',
          'delete_staff',
        ],
      },
      {
        name: 'Institute',
        slug: 'institute',
        unlisted: true,
        permissions: [
          'view_course_reports',
          'view_subject_reports',
          'download_course_reports',
          'download_subject_reports',
          'view_analytics',
          'view_packages',
          'view_students',
          'view_tests',
          'download_tests',
          'view_live_classes',
          'edit_live_classes',
          'delete_live_classes',
          'view_courses',
          'view_discussions',
          'replay_discussions',
          'create_discussions',
          'view_threads',
          'create_threads',
          'delete_threads',
          'view_notifications',
        ],
      },
      {
        name: 'Student',
        slug: 'student',
        unlisted: true,
        permissions: [
          'view_own_report',
          'view_live_classes',
          'view_tests',
          'take_tests',
          'view_discussions',
          'create_discussions',
          'replay_discussions',
          'view_threads',
          'create_threads',
          'delete_threads',
          'view_notifications',
        ],
      },
    ];

    for (const roleData of roles) {
      const existingRole = await this.roleModel.findOne({
        slug: roleData.slug,
      });
      if (existingRole) {
        existingRole.permissions = roleData.permissions;
        await existingRole.save();
      } else {
        await this.roleModel.create(roleData);
      }
    }
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
