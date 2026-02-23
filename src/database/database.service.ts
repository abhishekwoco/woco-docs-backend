import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions, MongooseOptionsFactory } from '@nestjs/mongoose';

@Injectable()
export class DatabaseService implements MongooseOptionsFactory {
  constructor(private configService: ConfigService) {}

  createMongooseOptions(): MongooseModuleOptions {
    return {
      uri: this.configService.get<string>('MONGODB_URI'),
      dbName: this.configService.get<string>('MONGODB_DATABASE'),
      ssl: true,
      authSource: 'admin',
    };
  }
}
