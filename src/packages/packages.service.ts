import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Package } from './schemas/package.schema';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackagesService {
  constructor(@InjectModel(Package.name) private packageModel: Model<Package>) {}

  create(createPackageDto: CreatePackageDto): Promise<Package> {
    const createdPackage = new this.packageModel(createPackageDto);
    return createdPackage.save();
  }

  findAll(): Promise<Package[]> {
    return this.packageModel.find().exec();
  }

  findOne(id: string): Promise<Package | null> {
    return this.packageModel.findById(id).exec();
  }

  update(id: string, updatePackageDto: UpdatePackageDto): Promise<Package | null> {
    return this.packageModel
      .findByIdAndUpdate(id, updatePackageDto, { new: true })
      .exec();
  }

  remove(id: string): Promise<Package | null> {
    return this.packageModel.findByIdAndDelete(id).exec();
  }
}
