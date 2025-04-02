import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Package } from './schemas/package.schema';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackagesService {
  constructor(
    @InjectModel(Package.name) private packageModel: Model<Package>,
  ) {}

  create(createPackageDto: CreatePackageDto): Promise<Package> {
    const createdPackage = new this.packageModel(createPackageDto);
    return createdPackage.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<{ packages: Package[]; total: number }> {
    const filter = search
      ? {
          $or: [
            { code: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const packages = await this.packageModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('subjects')
      .exec();
    const total = await this.packageModel.countDocuments(filter);
    return { packages, total };
  }

  async findAllForDropdown(): Promise<Package[]> {
    return this.packageModel
      .find({}, 'code description')
      .populate('subjects')
      .populate('course')
      .exec();
  }

  findOne(id: string): Promise<Package | null> {
    return this.packageModel
      .findById(id)
      .populate('course')
      .populate('class')
      .populate('subjects')
      .exec();
  }

  findByIds(ids: string[], populateData: boolean = false): Promise<Package[]> {
    if (populateData) {
      return this.packageModel
        .find({ _id: { $in: ids } })
        .populate('course')
        .populate('class')
        .populate('subjects')
        .exec();
    }
    return this.packageModel.find({ _id: { $in: ids } }).exec();
  }

  update(
    id: string,
    updatePackageDto: UpdatePackageDto,
  ): Promise<Package | null> {
    return this.packageModel
      .findByIdAndUpdate(id, updatePackageDto, { new: true })
      .exec();
  }

  remove(id: string): Promise<Package | null> {
    return this.packageModel.findByIdAndDelete(id).exec();
  }
}
