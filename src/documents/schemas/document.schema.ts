import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type DocumentDocument = HydratedDocument<Document>;

@Schema({ collection: 'doc-documents', timestamps: true })
export class Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  slug: string;

  @Prop()
  category: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  description: string;

  @Prop({ default: false })
  isPublished: boolean;

  @Prop({ type: String })
  userId: string;

  @Prop({ type: Object })
  metadata: {
    author?: string;
    version?: string;
  };
}

export const DocumentSchema = SchemaFactory.createForClass(Document);
