import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findOne(id: string): Promise<User | undefined | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByTokenAndOTP(
    verificationToken: string,
    verificationOtp: string,
  ): Promise<User | null> {
    return this.userModel
      .findOne({ verificationToken, verificationOtp })
      .exec();
  }

  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateProfileDto, { new: true })
      .exec();
  }

  async updateImageUrl(id: string, imageUrl: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, { imageUrl }, { new: true })
      .exec();
  }

  async updateCoverUrl(id: string, coverUrl: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, { coverUrl }, { new: true })
      .exec();
  }

  async updateBio(id: string, bio: string): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(id, { bio }, { new: true }).exec();
  }
}
