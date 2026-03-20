import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Document, DocumentDocument } from '../documents/schemas/document.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Document.name) private documentModel: Model<DocumentDocument>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Check if slug already exists
    const existingCategory = await this.categoryModel.findOne({
      slug: createCategoryDto.slug
    }).exec();

    if (existingCategory) {
      throw new BadRequestException('Category with this slug already exists');
    }

    // If parentId is provided, verify it exists
    if (createCategoryDto.parentId) {
      const parentCategory = await this.categoryModel.findById(createCategoryDto.parentId).exec();
      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }
    }

    // Check if order is unique within the same parent and persona context
    if (createCategoryDto.order !== undefined) {
      await this.validateOrderUniqueness(
        createCategoryDto.order,
        createCategoryDto.parentId || null,
        createCategoryDto.persona,
        null // No category ID since we're creating
      );
    }

    const createdCategory = new this.categoryModel(createCategoryDto);
    return createdCategory.save();
  }

  async findAll(): Promise<any[]> {
    const categories = await this.categoryModel.find().sort({ order: 1 }).exec();
    return this.addDocumentCounts(categories);
  }

  async findAllWithDocCounts(): Promise<any[]> {
    const categories = await this.categoryModel.find().sort({ order: 1 }).exec();
    return this.addDocumentCounts(categories);
  }

  async findOne(id: string): Promise<Category | null> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const category = await this.categoryModel.findOne({ slug }).exec();
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findRootCategories(): Promise<CategoryDocument[]> {
    return this.categoryModel
      .find({ parentId: null })
      .sort({ order: 1 })
      .exec();
  }

  async findSubcategories(parentId: string): Promise<CategoryDocument[]> {
    return this.categoryModel
      .find({ parentId })
      .sort({ order: 1 })
      .exec();
  }

  async findByPersona(persona: string): Promise<Category[]> {
    return this.categoryModel
      .find({ persona })
      .sort({ order: 1 })
      .exec();
  }

  async findCategoryTree(): Promise<any[]> {
    // Single query — load all categories, build tree in-memory
    const allCategories = await this.categoryModel.find().sort({ order: 1 }).exec();

    // Group by parentId
    const childrenMap = new Map<string, any[]>();
    const roots: any[] = [];

    for (const cat of allCategories) {
      const obj = (cat as any).toObject();
      const parentKey = obj.parentId?.toString() || null;
      if (!parentKey) {
        roots.push(obj);
      } else {
        if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
        childrenMap.get(parentKey)!.push(obj);
      }
    }

    const buildTree = (categories: any[]): any[] =>
      categories.map((cat) => ({
        ...cat,
        subcategories: buildTree(childrenMap.get(cat._id.toString()) || []),
      }));

    return buildTree(roots);
  }

  async findSidebarByPersona(persona: string): Promise<any[]> {
    // 2 queries total instead of N+1: all categories + all docs for this persona
    const [allCategories, allDocuments] = await Promise.all([
      this.categoryModel
        .find({ persona, isActive: true })
        .sort({ order: 1 })
        .exec(),
      this.documentModel
        .find({ isPublished: true })
        .select('_id title slug description order categoryId')
        .sort({ order: 1 })
        .exec(),
    ]);

    // Group categories by parentId
    const childrenMap = new Map<string, any[]>();
    const roots: any[] = [];
    const categoryIds = new Set(allCategories.map((c: any) => c._id.toString()));

    for (const cat of allCategories) {
      const obj = (cat as any).toObject();
      const parentKey = obj.parentId?.toString() || null;
      if (!parentKey || !categoryIds.has(parentKey)) {
        roots.push(obj);
      } else {
        if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
        childrenMap.get(parentKey)!.push(obj);
      }
    }

    // Group documents by categoryId
    const docsMap = new Map<string, any[]>();
    for (const doc of allDocuments) {
      const catId = (doc as any).categoryId?.toString();
      if (catId && categoryIds.has(catId)) {
        if (!docsMap.has(catId)) docsMap.set(catId, []);
        docsMap.get(catId)!.push({
          id: (doc as any)._id,
          title: doc.title,
          slug: doc.slug,
          description: doc.description,
          order: doc.order,
        });
      }
    }

    const buildTree = (categories: any[]): any[] =>
      categories.map((cat) => {
        const catId = cat._id.toString();
        return {
          id: cat._id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          order: cat.order,
          persona: cat.persona,
          documents: docsMap.get(catId) || [],
          subcategories: buildTree(childrenMap.get(catId) || []),
        };
      });

    return buildTree(roots);
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category | null> {
    const { category_id, ...updateData } = updateCategoryDto;

    // Get current category to check its current parentId
    const currentCategory = await this.categoryModel.findById(id).exec();
    if (!currentCategory) {
      throw new NotFoundException('Category not found');
    }

    // If updating slug, check it doesn't conflict with existing categories
    if (updateData.slug) {
      const existingCategory = await this.categoryModel.findOne({
        slug: updateData.slug,
        _id: { $ne: id }
      }).exec();

      if (existingCategory) {
        throw new BadRequestException('Category with this slug already exists');
      }
    }

    // If updating parentId, verify it exists and prevent circular references
    if (updateData.parentId !== undefined) {
      if (updateData.parentId) {
        const parentCategory = await this.categoryModel.findById(updateData.parentId).exec();
        if (!parentCategory) {
          throw new NotFoundException('Parent category not found');
        }

        // Prevent setting itself as parent
        if (updateData.parentId === id) {
          throw new BadRequestException('Category cannot be its own parent');
        }

        // Prevent circular references (simple check - parent shouldn't be a child)
        const isCircular = await this.checkCircularReference(id, updateData.parentId);
        if (isCircular) {
          throw new BadRequestException('Circular reference detected');
        }
      }
    }

    // Check if order is unique within the parent and persona context
    if (updateData.order !== undefined) {
      // Determine which parent to check against
      const parentToCheck = updateData.parentId !== undefined
        ? updateData.parentId
        : currentCategory.parentId;

      // Determine which persona to check against
      const personaToCheck = updateData.persona !== undefined
        ? updateData.persona
        : currentCategory.persona;

      await this.validateOrderUniqueness(
        updateData.order,
        parentToCheck,
        personaToCheck,
        id // Exclude current category from check
      );
    }

    const updatedCategory = await this.categoryModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updatedCategory) {
      throw new NotFoundException('Category not found');
    }

    return updatedCategory;
  }

  async remove(id: string): Promise<Category | null> {
    // Check if category has subcategories
    const subcategories = await this.findSubcategories(id);
    if (subcategories.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with subcategories. Please delete or reassign subcategories first.'
      );
    }

    const deletedCategory = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!deletedCategory) {
      throw new NotFoundException('Category not found');
    }

    return deletedCategory;
  }

  async reorderCategories(categoryOrders: Array<{ id: string; order: number }>): Promise<void> {
    const updatePromises = categoryOrders.map(({ id, order }) =>
      this.categoryModel.findByIdAndUpdate(id, { order }).exec()
    );
    await Promise.all(updatePromises);
  }

  private async checkCircularReference(categoryId: string, newParentId: string): Promise<boolean> {
    let currentId = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) {
        return true; // Circular reference
      }

      if (currentId === categoryId) {
        return true; // Would create a circular reference
      }

      visited.add(currentId);
      const parent = await this.categoryModel.findById(currentId).exec();

      if (!parent || !parent.parentId) {
        break;
      }

      currentId = parent.parentId;
    }

    return false;
  }

  private async validateOrderUniqueness(
    order: number,
    parentId: string | null,
    persona: string,
    excludeCategoryId: string | null
  ): Promise<void> {
    const query: any = { order, persona };

    // Check within the same parent context
    if (parentId) {
      query.parentId = parentId;
    } else {
      query.parentId = null; // Root level categories
    }

    // Exclude the category being updated (if updating)
    if (excludeCategoryId) {
      query._id = { $ne: excludeCategoryId };
    }

    const existingCategory = await this.categoryModel.findOne(query).exec();

    if (existingCategory) {
      const parentContext = parentId
        ? `under parent category "${parentId}"`
        : 'at root level';

      const personaLabel = persona === 'dev' ? 'Developer' : 'Customer Support';

      throw new BadRequestException(
        `Order ${order} is already taken by another ${personaLabel} category ${parentContext}. Please choose a different order.`
      );
    }
  }

  // Document assignment methods
  async getDocumentCount(categoryId: string): Promise<number> {
    return this.documentModel.countDocuments({ categoryId }).exec();
  }

  async getCategoryDocuments(categoryId: string): Promise<Document[]> {
    return this.documentModel
      .find({ categoryId })
      .populate('categoryId')
      .sort({ order: 1 })
      .exec();
  }

  async getAvailableDocuments(categoryId: string): Promise<Document[]> {
    // Get all documents not assigned to this category
    return this.documentModel
      .find({ categoryId: { $ne: categoryId } })
      .populate('categoryId')
      .sort({ title: 1 })
      .exec();
  }

  async assignDocumentToCategory(documentId: string, categoryId: string): Promise<Document> {
    // Verify category exists
    const category = await this.categoryModel.findById(categoryId).exec();
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Update document's categoryId
    const document = await this.documentModel
      .findByIdAndUpdate(
        documentId,
        { categoryId },
        { new: true }
      )
      .populate('categoryId')
      .exec();

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async unassignDocumentFromCategory(documentId: string, newCategoryId?: string): Promise<Document> {
    const updateData: any = {};

    if (newCategoryId) {
      // Verify new category exists
      const category = await this.categoryModel.findById(newCategoryId).exec();
      if (!category) {
        throw new NotFoundException('New category not found');
      }
      updateData.categoryId = newCategoryId;
    } else {
      throw new BadRequestException('Document must be assigned to a category');
    }

    const document = await this.documentModel
      .findByIdAndUpdate(
        documentId,
        updateData,
        { new: true }
      )
      .populate('categoryId')
      .exec();

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  private async addDocumentCounts(categories: any[]): Promise<any[]> {
    // Single aggregation instead of N count queries
    const categoryIds = categories.map((c) => {
      const obj = c.toObject ? c.toObject() : c;
      return obj._id;
    });

    const counts = await this.documentModel.aggregate([
      { $match: { categoryId: { $in: categoryIds } } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]).exec();

    const countMap = new Map(counts.map((c: any) => [c._id.toString(), c.count]));

    return categories.map((category) => {
      const categoryObj = category.toObject ? category.toObject() : category;
      return {
        ...categoryObj,
        assignedDocsCount: countMap.get(categoryObj._id.toString()) || 0,
      };
    });
  }
}
