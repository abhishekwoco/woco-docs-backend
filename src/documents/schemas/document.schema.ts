import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type DocumentDocument = HydratedDocument<Document>;

@Schema({ collection: 'doc-documents', timestamps: true })
export class Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category' })
  categoryId: string;

  // Legacy field - kept for backward compatibility, but should use categoryId instead
  @Prop({ type: String })
  category?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  description: string;

  @Prop({ default: false })
  isPublished: boolean;

  @Prop({ type: String })
  userId: string;

  @Prop({ default: 1, min: 1 })
  order: number;

  @Prop({ type: Object })
  metadata: {
    author?: string;
    version?: string;
    [key: string]: any;
  };
}

export const DocumentSchema = SchemaFactory.createForClass(Document);

// Create indexes for better query performance
// Note: slug index is already created by unique: true
DocumentSchema.index({ categoryId: 1 });
DocumentSchema.index({ userId: 1 });
DocumentSchema.index({ isPublished: 1 });
DocumentSchema.index({ order: 1 });
