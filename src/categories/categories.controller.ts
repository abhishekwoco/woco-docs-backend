import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { WritePermissionGuard } from '../documents/guards/write-permission.guard';

@Controller('categories')
@UseGuards(TokenAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post('create')
  @UseGuards(WritePermissionGuard)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  findAll(
    @Query('view') view?: string,
    @Query('persona') persona?: string,
  ) {
    if (view === 'tree') {
      return this.categoriesService.findCategoryTree();
    }
    if (persona) {
      return this.categoriesService.findByPersona(persona);
    }
    return this.categoriesService.findAll();
  }

  @Get('roots')
  findRoots() {
    return this.categoriesService.findRootCategories();
  }

  @Get('sidebar/:persona')
  getSidebar(@Param('persona') persona: string) {
    return this.categoriesService.findSidebarByPersona(persona);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Get(':id/subcategories')
  findSubcategories(@Param('id') id: string) {
    return this.categoriesService.findSubcategories(id);
  }

  @Post('update')
  @UseGuards(WritePermissionGuard)
  update(@Body() updateCategoryDto: UpdateCategoryDto) {
    const { category_id, ...updateData } = updateCategoryDto;
    return this.categoriesService.update(category_id, updateCategoryDto);
  }

  @Post('reorder')
  @UseGuards(WritePermissionGuard)
  reorder(@Body() reorderDto: { categories: Array<{ id: string; order: number }> }) {
    return this.categoriesService.reorderCategories(reorderDto.categories);
  }

  @Post('delete')
  @UseGuards(WritePermissionGuard)
  remove(@Body() deleteCategoryDto: { category_id: string }) {
    return this.categoriesService.remove(deleteCategoryDto.category_id);
  }

  // Document assignment endpoints
  @Get(':id/documents')
  getCategoryDocuments(@Param('id') id: string) {
    return this.categoriesService.getCategoryDocuments(id);
  }

  @Get(':id/documents/available')
  getAvailableDocuments(@Param('id') id: string) {
    return this.categoriesService.getAvailableDocuments(id);
  }

  @Post(':id/documents/assign')
  @UseGuards(WritePermissionGuard)
  assignDocument(
    @Param('id') categoryId: string,
    @Body() assignDto: { document_id: string }
  ) {
    return this.categoriesService.assignDocumentToCategory(assignDto.document_id, categoryId);
  }

  @Post(':id/documents/unassign')
  @UseGuards(WritePermissionGuard)
  unassignDocument(
    @Param('id') categoryId: string,
    @Body() unassignDto: { document_id: string; new_category_id?: string }
  ) {
    return this.categoriesService.unassignDocumentFromCategory(
      unassignDto.document_id,
      unassignDto.new_category_id
    );
  }
}
