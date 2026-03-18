import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ collection: 'doc-categories', timestamps: true })
export class Category {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description: string;

  @Prop({ type: String, enum: ['cs', 'dev'], required: true })
  persona: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category', default: null })
  parentId: string | null;

  @Prop({ default: 1, min: 1 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  metadata: {
    icon?: string;
    color?: string;
    [key: string]: any;
  };
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Create indexes for better query performance
// Note: slug index is already created by unique: true
CategorySchema.index({ name: 1, parentId: 1 }, { unique: true });
CategorySchema.index({ parentId: 1 });
CategorySchema.index({ order: 1 });
CategorySchema.index({ persona: 1 });
